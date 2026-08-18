"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type MouseHandlerDataParam,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import type { WeightPoint } from "@/lib/weight-history";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type RangeOption = {
  label: string;
  days: number | null;
};

const ranges: RangeOption[] = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "6 months", days: 180 },
  { label: "1 year", days: 365 },
  { label: "3 years", days: 1095 },
  { label: "All", days: null },
];

type WeightHistoryChartProps = {
  data: WeightPoint[];
  goal?: number | null;
};

type RangeSelection =
  | { kind: "preset"; days: number | null }
  | { kind: "custom"; start: number; end: number };

const DEFAULT_RANGE: RangeSelection = { kind: "preset", days: 90 };

// One row per day-offset-from-period-start, so two periods of unequal
// calendar dates but equal length can share a single numeric x-axis —
// each field is only set on the offsets where that period actually has a
// reading (weigh-ins aren't necessarily daily), and the chart connects
// across the gaps (see `connectNulls` below) the same way the normal
// single-period chart already does by only plotting real entries.
interface OverlayRow {
  offset: number;
  current?: number;
  currentDate?: number;
  previous?: number;
  previousDate?: number;
}

// Points are UTC-midnight timestamps for a calendar date with no
// time-of-day meaning (see weight-history.ts) — format in UTC too, or a
// viewer in a timezone behind UTC would see every date roll back a day.
function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

// Recharts' default tooltip is an inline-styled white box that doesn't
// follow the page's dark mode, so it renders as a glaring light rectangle
// against the dark chart — render our own using the same theme-aware
// Tailwind classes as the rest of the page instead.
function ChartTooltip({ active, label, payload }: TooltipContentProps) {
  if (!active || !payload?.length || typeof label !== "number") return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <div className="text-muted-foreground">{formatDate(label)}</div>
      <div className="font-medium">{Number(payload[0].value).toFixed(1)}</div>
    </div>
  );
}

function ChartTooltipCompare({ active, label, payload }: TooltipContentProps) {
  if (!active || !payload?.length || typeof label !== "number") return null;
  const row = payload[0]?.payload as OverlayRow | undefined;
  if (!row) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <div className="mb-1 text-muted-foreground">Day {label}</div>
      {row.current != null && (
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: "var(--chart-series-1)" }}
          />
          <span className="font-medium">{row.current.toFixed(1)}</span>
          {row.currentDate != null && (
            <span className="text-xs text-muted-foreground">
              {formatDate(row.currentDate)}
            </span>
          )}
        </div>
      )}
      {row.previous != null && (
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: "var(--chart-series-2)" }}
          />
          <span className="font-medium">{row.previous.toFixed(1)}</span>
          {row.previousDate != null && (
            <span className="text-xs text-muted-foreground">
              {formatDate(row.previousDate)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function WeightHistoryChart({ data, goal }: WeightHistoryChartProps) {
  const [range, setRange] = useState<RangeSelection>(DEFAULT_RANGE);
  const [compareEnabled, setCompareEnabled] = useState(false);

  // Tracks an in-progress click-and-drag selection on the chart itself,
  // independent of `range` — only committed to `range` on mouse-up, so a
  // drag that gets cancelled (or is just a click) never changes anything.
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const visibleData = useMemo(() => {
    if (range.kind === "custom") {
      return data.filter(
        (point) => point.timestamp >= range.start && point.timestamp <= range.end,
      );
    }

    if (range.days === null || data.length <= range.days) {
      return data;
    }

    return data.slice(-range.days);
  }, [data, range]);

  function handleMouseDown(state: MouseHandlerDataParam) {
    if (typeof state.activeLabel !== "number") return;
    setDragStart(state.activeLabel);
    setDragEnd(state.activeLabel);
  }

  function handleMouseMove(state: MouseHandlerDataParam) {
    if (dragStart === null || typeof state.activeLabel !== "number") return;
    setDragEnd(state.activeLabel);
  }

  function handleMouseUp() {
    if (dragStart !== null && dragEnd !== null && dragStart !== dragEnd) {
      setRange({
        kind: "custom",
        start: Math.min(dragStart, dragEnd),
        end: Math.max(dragStart, dragEnd),
      });
    }
    setDragStart(null);
    setDragEnd(null);
  }

  const statistics = useMemo(() => {
    if (visibleData.length === 0) {
      return null;
    }

    const first = visibleData[0];
    const last = visibleData[visibleData.length - 1];
    const values = visibleData.map((item) => item.total);

    return {
      first,
      last,
      change: last.total - first.total,
      minimum: Math.min(...values),
      maximum: Math.max(...values),
    };
  }, [visibleData]);

  // "Previous period" is the same-length span of calendar time immediately
  // before the currently visible one (not the previous N *entries* —
  // weigh-ins are sparse, so anchoring on elapsed time is what makes "day
  // 7 of this period" and "day 7 of last period" comparable).
  const periodDurationMs = statistics
    ? statistics.last.timestamp - statistics.first.timestamp
    : 0;

  const previousPeriodData = useMemo(() => {
    if (!statistics || periodDurationMs <= 0) return [];
    const previousStart = statistics.first.timestamp - periodDurationMs;
    const previousEnd = statistics.first.timestamp;
    return data.filter(
      (point) => point.timestamp >= previousStart && point.timestamp < previousEnd,
    );
  }, [data, statistics, periodDurationMs]);

  const previousStatistics = useMemo(() => {
    if (previousPeriodData.length === 0) return null;
    const first = previousPeriodData[0];
    const last = previousPeriodData[previousPeriodData.length - 1];
    return { first, last, change: last.total - first.total };
  }, [previousPeriodData]);

  const maxOffset = periodDurationMs > 0 ? Math.round(periodDurationMs / MS_PER_DAY) : 0;

  const overlayRows = useMemo(() => {
    if (!compareEnabled || !statistics) return [];

    const rows: OverlayRow[] = Array.from({ length: maxOffset + 1 }, (_, offset) => ({
      offset,
    }));

    for (const point of visibleData) {
      const offset = Math.round(
        (point.timestamp - statistics.first.timestamp) / MS_PER_DAY,
      );
      if (offset >= 0 && offset <= maxOffset) {
        rows[offset].current = point.total;
        rows[offset].currentDate = point.timestamp;
      }
    }

    if (previousStatistics) {
      const previousStart = statistics.first.timestamp - periodDurationMs;
      for (const point of previousPeriodData) {
        const offset = Math.round((point.timestamp - previousStart) / MS_PER_DAY);
        if (offset >= 0 && offset <= maxOffset) {
          rows[offset].previous = point.total;
          rows[offset].previousDate = point.timestamp;
        }
      }
    }

    return rows;
  }, [
    compareEnabled,
    statistics,
    previousStatistics,
    previousPeriodData,
    visibleData,
    maxOffset,
    periodDurationMs,
  ]);

  if (!statistics) {
    return <p>No weight data is available.</p>;
  }

  const changeDelta = previousStatistics ? statistics.change - previousStatistics.change : null;

  return (
    <section className="space-y-4">
      {/* Horizontally scrollable rather than wrapping — on narrow
          viewports a flex-wrap row of this many options pushes the chart
          down awkwardly; a swipeable row keeps the chart pinned right
          below the range controls. shrink-0 stops buttons from being
          squeezed as flex children of a scroll container. */}
      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto">
        {ranges.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setRange({ kind: "preset", days: option.days })}
            className={[
              "shrink-0 rounded-lg border px-3 py-2 text-sm whitespace-nowrap",
              range.kind === "preset" && range.days === option.days
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-surface",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}

        {range.kind === "custom" && (
          <button
            type="button"
            onClick={() => setRange(DEFAULT_RANGE)}
            className="shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm whitespace-nowrap text-muted-foreground"
          >
            Reset zoom
          </button>
        )}

        <button
          type="button"
          onClick={() => setCompareEnabled((value) => !value)}
          className={[
            "shrink-0 rounded-lg border px-3 py-2 text-sm whitespace-nowrap",
            compareEnabled
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border bg-surface",
          ].join(" ")}
        >
          Compare to previous period
        </button>
      </div>

      {compareEnabled ? (
        previousStatistics ? (
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: "var(--chart-series-1)" }}
              />
              {formatDate(statistics.first.timestamp)} – {formatDate(statistics.last.timestamp)}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: "var(--chart-series-2)" }}
              />
              {formatDate(previousStatistics.first.timestamp)} –{" "}
              {formatDate(previousStatistics.last.timestamp)}
            </span>
          </span>
        ) : (
          <span className="block text-sm text-muted-foreground">
            Not enough earlier history to compare against this range yet.
          </span>
        )
      ) : (
        <span className="block text-sm text-muted-foreground">
          Drag on the chart to zoom into a range
        </span>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric
          label={compareEnabled ? "Current start" : "Visible start"}
          value={`${formatDate(statistics.first.timestamp)} · ${statistics.first.total.toFixed(1)}`}
        />

        <Metric
          label={compareEnabled ? "Current end" : "Visible end"}
          value={`${formatDate(statistics.last.timestamp)} · ${statistics.last.total.toFixed(1)}`}
        />

        {compareEnabled && previousStatistics ? (
          <>
            <Metric
              label="Previous change"
              value={`${previousStatistics.change >= 0 ? "+" : ""}${previousStatistics.change.toFixed(1)}`}
            />
            <Metric
              label="Change vs previous"
              value={
                changeDelta === null
                  ? "—"
                  : `${changeDelta >= 0 ? "+" : ""}${changeDelta.toFixed(1)}`
              }
            />
          </>
        ) : (
          <>
            <Metric
              label="Change"
              value={`${statistics.change >= 0 ? "+" : ""}${statistics.change.toFixed(1)}`}
            />
            <Metric
              label="Visible range"
              value={`${statistics.minimum.toFixed(1)}–${statistics.maximum.toFixed(1)}`}
            />
          </>
        )}
      </div>

      <div className="h-[430px] w-full rounded-xl border border-border p-2 select-none">
        {compareEnabled ? (
          previousStatistics ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={overlayRows}
                margin={{ top: 20, right: 16, bottom: 10, left: 0 }}
              >
                <defs>
                  <linearGradient id="weightFillCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-series-1)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--chart-series-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="weightFillPrevious" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-series-2)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--chart-series-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />

                <XAxis
                  dataKey="offset"
                  type="number"
                  domain={[0, maxOffset]}
                  tickFormatter={(value: number) => `Day ${value}`}
                  minTickGap={35}
                />

                <YAxis
                  domain={[
                    (dataMin: number) =>
                      goal != null ? Math.min(dataMin, goal) : dataMin,
                    (dataMax: number) =>
                      goal != null ? Math.max(dataMax, goal) : dataMax,
                  ]}
                  width={45}
                  tickFormatter={(value: number) => value.toFixed(0)}
                />

                <Tooltip content={ChartTooltipCompare} position={{ y: 0 }} />

                {goal != null && (
                  <ReferenceLine
                    y={goal}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Goal: ${goal.toFixed(1)}`,
                      position: "insideBottomRight",
                      fill: "var(--muted-foreground)",
                      fontSize: 12,
                    }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="previous"
                  stroke="var(--chart-series-2)"
                  fill="url(#weightFillPrevious)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls
                />

                <Area
                  type="monotone"
                  dataKey="current"
                  stroke="var(--chart-series-1)"
                  fill="url(#weightFillCurrent)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Pick a shorter range, or log more history further back, to unlock a
              comparison.
            </div>
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={visibleData}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="cursor-crosshair"
              margin={{
                top: 20,
                right: 16,
                bottom: 10,
                left: 0,
              }}
            >
              <defs>
                <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />

              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                tickFormatter={(value: number) =>
                  new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    year: "2-digit",
                    timeZone: "UTC",
                  }).format(new Date(value))
                }
                minTickGap={35}
              />

              <YAxis
                domain={[
                  (dataMin: number) =>
                    goal != null ? Math.min(dataMin, goal) : dataMin,
                  (dataMax: number) =>
                    goal != null ? Math.max(dataMax, goal) : dataMax,
                ]}
                width={45}
                tickFormatter={(value: number) => value.toFixed(0)}
              />

              <Tooltip content={ChartTooltip} position={{ y: 0 }} />

              {goal != null && (
                <ReferenceLine
                  y={goal}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Goal: ${goal.toFixed(1)}`,
                    position: "insideBottomRight",
                    fill: "var(--muted-foreground)",
                    fontSize: 12,
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey="total"
                stroke="currentColor"
                fill="url(#weightFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
                className="text-accent"
              />

              {dragStart !== null && dragEnd !== null && (
                <ReferenceArea
                  x1={dragStart}
                  x2={dragEnd}
                  strokeOpacity={0.3}
                  fillOpacity={0.15}
                  fill="currentColor"
                  className="text-accent"
                />
              )}

              <Brush
                dataKey="timestamp"
                height={35}
                travellerWidth={12}
                fill="var(--background)"
                stroke="var(--foreground)"
                tickFormatter={(value: number) =>
                  new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    year: "2-digit",
                    timeZone: "UTC",
                  }).format(new Date(value))
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
