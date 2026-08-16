"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  type TooltipContentProps,
} from "recharts";
import type { ActivityFact } from "@/lib/recent-activity";

const WINDOW_DAYS = 14;

interface BubblePoint {
  dayIndex: number; // 0 = oldest day in the window, WINDOW_DAYS - 1 = today
  dateLabel: string;
  postTypeSlug: string;
  postTypeLabel: string;
  yIndex: number;
  count: number;
}

// Same local-date convention as content/[slug]/date-range.ts — kept as
// its own copy rather than a shared import since that module is scoped
// to the content-list feature, not this dashboard widget.
function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as BubblePoint;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <div className="text-muted-foreground">{point.dateLabel}</div>
      <div className="font-medium">
        {point.postTypeLabel}: {point.count} {point.count === 1 ? "post" : "posts"}
      </div>
    </div>
  );
}

export function RecentActivityChart({ facts }: { facts: ActivityFact[] }) {
  const { points, labels, dayLabels } = useMemo(() => {
    // Computed from the browser's own clock, not the server's — see the
    // comment on ActivityFact.updatedAtMs.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { dateKey: string; label: string }[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({
        dateKey: localDateString(d),
        label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d),
      });
    }
    const dayIndexByKey = new Map(days.map((d, i) => [d.dateKey, i]));
    const windowStartKey = days[0].dateKey;

    // Count per (day, post type), skipping anything outside the window.
    const counts = new Map<string, { label: string; slug: string; count: number }>();
    for (const fact of facts) {
      const dateKey = localDateString(new Date(fact.updatedAtMs));
      if (dateKey < windowStartKey) continue;
      const key = `${dateKey}::${fact.postTypeSlug}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label: fact.postTypeLabel, slug: fact.postTypeSlug, count: 1 });
      }
    }

    // Rows ordered by total recent activity (most active first) — more
    // useful at a glance than alphabetical for a "what's been happening"
    // widget.
    const totalsBySlug = new Map<string, { label: string; total: number }>();
    for (const { slug, label, count } of counts.values()) {
      const existing = totalsBySlug.get(slug);
      if (existing) {
        existing.total += count;
      } else {
        totalsBySlug.set(slug, { label, total: count });
      }
    }
    // Ascending, not descending — yIndex increases upward on the chart
    // (standard Cartesian orientation), so the most-active type needs
    // the *highest* index to end up drawn at the top.
    const orderedSlugs = [...totalsBySlug.entries()]
      .sort((a, b) => a[1].total - b[1].total)
      .map(([slug]) => slug);
    const yIndexBySlug = new Map(orderedSlugs.map((slug, i) => [slug, i]));

    const points: BubblePoint[] = [];
    for (const [key, { label, slug, count }] of counts) {
      const dateKey = key.split("::")[0];
      const dayIndex = dayIndexByKey.get(dateKey);
      const yIndex = yIndexBySlug.get(slug);
      if (dayIndex === undefined || yIndex === undefined) continue;
      points.push({
        dayIndex,
        dateLabel: days[dayIndex].label,
        postTypeSlug: slug,
        postTypeLabel: label,
        yIndex,
        count,
      });
    }

    return {
      points,
      labels: orderedSlugs.map((slug) => totalsBySlug.get(slug)!.label),
      dayLabels: days.map((d) => d.label),
    };
  }, [facts]);

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No activity in the last {WINDOW_DAYS} days.
      </p>
    );
  }

  return (
    <div
      className="w-full rounded-xl border border-border p-2"
      style={{ height: Math.max(240, labels.length * 44 + 60) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis
            dataKey="dayIndex"
            type="number"
            domain={[0, WINDOW_DAYS - 1]}
            ticks={[0, WINDOW_DAYS - 1]}
            tickFormatter={(value: number) => dayLabels[value] ?? ""}
          />
          <YAxis
            dataKey="yIndex"
            type="number"
            domain={[-0.5, labels.length - 0.5]}
            ticks={labels.map((_, i) => i)}
            tickFormatter={(value: number) => labels[value] ?? ""}
            width={110}
          />
          <ZAxis dataKey="count" range={[80, 600]} />
          <Tooltip content={ChartTooltip} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={points} fill="currentColor" fillOpacity={0.7} className="text-accent" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
