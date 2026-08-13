"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PostType } from "@/lib/post-types";
import type { Post } from "@/lib/posts";
import { TimeChart } from "./TimeChart";
import { PostListTable } from "./PostListTable";
import type { TimeChartResult } from "./time-chart-data";
import { RANGE_OPTIONS, cutoffDateString, isWithinRange, type RangeDays } from "./date-range";

// Owns the single date-range selection shared by the chart and the list
// table below it — previously two disconnected pieces of state, so picking
// a range on the table never changed what the chart above it showed.
export function TimeTrackerSection({
  slug,
  postType,
  posts,
  editable,
  dateFieldKey,
  startFieldKey,
  endFieldKey,
  chartResult,
}: {
  slug: string;
  postType: PostType;
  posts: Post[];
  editable: boolean;
  dateFieldKey?: string;
  startFieldKey?: string;
  endFieldKey?: string;
  chartResult: TimeChartResult;
}) {
  const hasDateRange = !!dateFieldKey;
  const [selectedDays, setSelectedDays] = useState<RangeDays>(hasDateRange ? 1 : null);
  const cutoff = useMemo(() => cutoffDateString(selectedDays), [selectedDays]);

  const visiblePosts = useMemo(() => {
    if (!dateFieldKey || cutoff === null) return posts;
    return posts.filter((post) => {
      const value = post.values[dateFieldKey];
      return isWithinRange(typeof value === "string" ? value : null, cutoff);
    });
  }, [posts, dateFieldKey, cutoff]);

  const visibleFacts = useMemo(() => {
    if (chartResult.kind !== "ready") return [];
    if (cutoff === null) return chartResult.facts;
    return chartResult.facts.filter((fact) => isWithinRange(fact.dateValue, cutoff));
  }, [chartResult, cutoff]);

  return (
    <>
      {hasDateRange && (
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setSelectedDays(range.days)}
              className={[
                "rounded-lg border px-3 py-1.5 text-sm",
                selectedDays === range.days
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface",
              ].join(" ")}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}

      {chartResult.kind === "ready" && (
        <TimeChart dimensions={chartResult.dimensions} facts={visibleFacts} />
      )}

      {editable && (
        <Link
          href={`/content/${slug}/new`}
          className="text-sm font-medium text-accent hover:underline"
        >
          + New {postType.label.toLowerCase()}
        </Link>
      )}

      <PostListTable
        slug={slug}
        postType={postType}
        posts={visiblePosts}
        hasAnyPosts={posts.length > 0}
        editable={editable}
        dateFieldKey={dateFieldKey}
        startFieldKey={startFieldKey}
        endFieldKey={endFieldKey}
      />
    </>
  );
}
