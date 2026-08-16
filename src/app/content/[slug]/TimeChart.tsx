"use client";

import { useState } from "react";
import type { TimeChartDimensionMeta, TimeChartFact } from "./time-chart-data";
import { formatDurationMinutes as formatHours } from "@/lib/duration";

const RADIUS = 75;
const STROKE_WIDTH = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP_PX = 3;
const MAX_NAMED_SLICES = 3;

const SVG_DISPLAY_PX = 220;
const SVG_VIEWBOX_PX = 200;
// The donut's actual empty center in display pixels — the label overlay
// below is sized to this (not the full SVG box) so a long slice label
// wraps inside the hole instead of bleeding onto the colored ring, where
// the label's muted-ink color has no reliable contrast against it.
const INNER_HOLE_DIAMETER_PX =
  (RADIUS - STROKE_WIDTH / 2) * 2 * (SVG_DISPLAY_PX / SVG_VIEWBOX_PX);
// A square inscribed in the hole's circle, with a little margin so text
// never touches the ring even at the box's corners.
const LABEL_BOX_PX = Math.floor(INNER_HOLE_DIAMETER_PX * 0.62);

interface TimeChartSlice {
  label: string;
  minutes: number;
  colorSlot: 0 | 1 | 2 | -1; // -1 == "Other"
}

// `facts` is expected to already be filtered to the caller's selected date
// range — aggregation (grouping + top-3 + Other) happens here, over
// already-permission-checked labels, so re-slicing by range never needs
// another server round trip.
function aggregateSlices(facts: TimeChartFact[], fieldKey: string): TimeChartSlice[] {
  const minutesByLabel = new Map<string, number>();
  for (const fact of facts) {
    const label = fact.groups[fieldKey];
    if (!label) continue;
    minutesByLabel.set(label, (minutesByLabel.get(label) ?? 0) + fact.minutes);
  }

  const named = Array.from(minutesByLabel.entries()).map(([label, minutes]) => ({
    label,
    minutes,
  }));
  named.sort((a, b) => b.minutes - a.minutes);

  const top = named
    .slice(0, MAX_NAMED_SLICES)
    .map((entry, index): TimeChartSlice => ({ ...entry, colorSlot: index as 0 | 1 | 2 }));
  const overflowMinutes = named
    .slice(MAX_NAMED_SLICES)
    .reduce((sum, entry) => sum + entry.minutes, 0);

  const slices = [...top];
  if (overflowMinutes > 0) {
    slices.push({ label: "Other", minutes: overflowMinutes, colorSlot: -1 });
  }
  return slices;
}

function sliceColor(colorSlot: TimeChartSlice["colorSlot"]): string {
  switch (colorSlot) {
    case 0:
      return "var(--chart-series-1)";
    case 1:
      return "var(--chart-series-2)";
    case 2:
      return "var(--chart-series-3)";
    default:
      return "var(--chart-series-other)";
  }
}

function TotalOnly({ totalMinutes }: { totalMinutes: number }) {
  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <span className="text-5xl font-semibold">{formatHours(totalMinutes)}</span>
      <span className="text-sm text-muted-foreground">total time tracked</span>
    </div>
  );
}

function Donut({
  totalMinutes,
  slices,
}: {
  totalMinutes: number;
  slices: TimeChartSlice[];
}) {
  // Precompute each segment's arc length and where it starts along the
  // circumference — as plain, non-mutating derived arrays (no variable
  // reassignment during the JSX map below).
  const segmentLengths = slices.map(
    (slice) => (slice.minutes / totalMinutes) * CIRCUMFERENCE,
  );
  const segmentOffsets = segmentLengths.map((_, i) =>
    segmentLengths.slice(0, i).reduce((sum, length) => sum + length, 0),
  );

  // Hovering a segment OR its legend row (same index, either triggers it)
  // swaps the fixed center label to that slice's detail instead of
  // following the cursor around — same "pinned, not chasing the mouse"
  // preference already applied to the weight chart's tooltip.
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hovered = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="flex flex-col items-center gap-6 text-foreground">
      <div className="relative">
        <svg
          viewBox="0 0 200 200"
          width={220}
          height={220}
          role="img"
          aria-label={`Time tracked, total ${formatHours(totalMinutes)}`}
        >
          {slices.map((slice, index) => {
            const segmentLength = segmentLengths[index];
            const dash = Math.max(segmentLength - SEGMENT_GAP_PX, 0);
            const dimmed = hoveredIndex !== null && hoveredIndex !== index;
            return (
              <circle
                key={slice.label}
                cx={100}
                cy={100}
                r={RADIUS}
                fill="none"
                stroke={sliceColor(slice.colorSlot)}
                strokeWidth={hoveredIndex === index ? STROKE_WIDTH + 4 : STROKE_WIDTH}
                strokeOpacity={dimmed ? 0.35 : 1}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-segmentOffsets[index]}
                transform="rotate(-90 100 100)"
                className="cursor-default transition-[stroke-width,stroke-opacity]"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <title>{`${slice.label}: ${formatHours(slice.minutes)}`}</title>
              </circle>
            );
          })}
        </svg>
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center"
          style={{ width: LABEL_BOX_PX, height: LABEL_BOX_PX }}
        >
          {hovered ? (
            <>
              <span className="text-lg font-semibold">{formatHours(hovered.minutes)}</span>
              <span className="line-clamp-2 text-xs break-words text-muted-foreground">
                {hovered.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round((hovered.minutes / totalMinutes) * 100)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-semibold">{formatHours(totalMinutes)}</span>
              <span className="text-xs text-muted-foreground">total</span>
            </>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-2 text-sm">
        {slices.map((slice, index) => (
          <li
            key={slice.label}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={[
              "flex items-center gap-2 rounded-md px-1.5 py-0.5",
              hoveredIndex === index ? "bg-foreground/5" : "",
            ].join(" ")}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: sliceColor(slice.colorSlot) }}
            />
            <span className={hoveredIndex === index ? "font-medium" : undefined}>
              {slice.label}
            </span>
            <span className="text-muted-foreground">{formatHours(slice.minutes)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TimeChart({
  dimensions,
  facts,
}: {
  dimensions: TimeChartDimensionMeta[];
  facts: TimeChartFact[];
}) {
  // Dimensions are ordered with the default (e.g. Technology) first — see
  // time-chart-data.ts — so the first one is the initial selection.
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(
    dimensions[0]?.fieldKey ?? null,
  );

  const totalMinutes = facts.reduce((sum, fact) => sum + fact.minutes, 0);

  if (totalMinutes === 0) {
    return <p className="text-sm text-muted-foreground">Nothing tracked yet.</p>;
  }

  const active = dimensions.find((d) => d.fieldKey === activeFieldKey) ?? dimensions[0];
  const slices = active?.viewable ? aggregateSlices(facts, active.fieldKey) : null;

  return (
    <div className="flex flex-col items-center gap-4">
      {dimensions.length > 1 && (
        // Horizontally scrollable rather than wrapping — same fix as
        // the date-range pill rows (weight-history-chart.tsx,
        // TimeTrackerSection.tsx); justify-center is dropped since it
        // doesn't play well with overflow scrolling once content is
        // wider than the container.
        <div className="scrollbar-hide flex w-full items-center gap-2 overflow-x-auto">
          {dimensions.map((dimension) => (
            <button
              key={dimension.fieldKey}
              type="button"
              onClick={() => setActiveFieldKey(dimension.fieldKey)}
              className={[
                "shrink-0 rounded-lg border px-3 py-1.5 text-sm whitespace-nowrap",
                dimension.fieldKey === active?.fieldKey
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface",
              ].join(" ")}
            >
              By {dimension.label}
            </button>
          ))}
        </div>
      )}

      {slices && slices.length > 0 ? (
        <Donut totalMinutes={totalMinutes} slices={slices} />
      ) : (
        <TotalOnly totalMinutes={totalMinutes} />
      )}
    </div>
  );
}
