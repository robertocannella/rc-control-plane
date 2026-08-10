"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  type MouseHandlerDataParam,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import type { WeightPoint } from "@/lib/weight-history";

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
};

type RangeSelection =
  | { kind: "preset"; days: number | null }
  | { kind: "custom"; start: number; end: number };

const DEFAULT_RANGE: RangeSelection = { kind: "preset", days: 365 };

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

// Recharts' default tooltip is an inline-styled white box that doesn't
// follow the page's dark mode, so it renders as a glaring light rectangle
// against the dark chart — render our own using the same theme-aware
// Tailwind classes as the rest of the page instead.
function ChartTooltip({ active, label, payload }: TooltipContentProps) {
  if (!active || !payload?.length || typeof label !== "number") return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-zinc-500">{formatDate(label)}</div>
      <div className="font-medium">{Number(payload[0].value).toFixed(1)}</div>
    </div>
  );
}

export function WeightHistoryChart({ data }: WeightHistoryChartProps) {
  const [range, setRange] = useState<RangeSelection>(DEFAULT_RANGE);

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

  if (!statistics) {
    return <p>No weight data is available.</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {ranges.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setRange({ kind: "preset", days: option.days })}
            className={[
              "rounded-lg border px-3 py-2 text-sm",
              range.kind === "preset" && range.days === option.days
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}

        {range.kind === "custom" && (
          <button
            type="button"
            onClick={() => setRange(DEFAULT_RANGE)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            Reset zoom
          </button>
        )}

        <span className="text-sm text-zinc-500">
          Drag on the chart to zoom into a range
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric
          label="Visible start"
          value={`${formatDate(statistics.first.timestamp)} · ${statistics.first.total.toFixed(1)}`}
        />

        <Metric
          label="Visible end"
          value={`${formatDate(statistics.last.timestamp)} · ${statistics.last.total.toFixed(1)}`}
        />

        <Metric
          label="Change"
          value={`${statistics.change >= 0 ? "+" : ""}${statistics.change.toFixed(1)}`}
        />

        <Metric
          label="Visible range"
          value={`${statistics.minimum.toFixed(1)}–${statistics.maximum.toFixed(1)}`}
        />
      </div>

      <div className="h-[430px] w-full cursor-crosshair rounded-xl border border-zinc-200 p-2 select-none dark:border-zinc-800">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={visibleData}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
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
                }).format(new Date(value))
              }
              minTickGap={35}
            />

            <YAxis
              domain={["auto", "auto"]}
              width={45}
              tickFormatter={(value: number) => value.toFixed(0)}
            />

            <Tooltip content={ChartTooltip} />

            <Area
              type="monotone"
              dataKey="total"
              stroke="currentColor"
              fill="url(#weightFill)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
              className="text-blue-600 dark:text-blue-400"
            />

            {dragStart !== null && dragEnd !== null && (
              <ReferenceArea
                x1={dragStart}
                x2={dragEnd}
                strokeOpacity={0.3}
                fillOpacity={0.15}
                fill="currentColor"
                className="text-blue-600 dark:text-blue-400"
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
                }).format(new Date(value))
              }
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
