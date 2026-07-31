import type { TimeChartResult, TimeChartSlice } from "./time-chart-data";

const RADIUS = 75;
const STROKE_WIDTH = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP_PX = 3;

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

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function TimeChart({ result }: { result: TimeChartResult }) {
  if (result.kind === "not-applicable") return null;

  if (result.kind === "empty") {
    return (
      <p className="text-sm text-gray-500">Nothing tracked yet.</p>
    );
  }

  if (result.kind === "total-only") {
    return (
      <div className="flex flex-col items-center gap-1 py-6">
        <span className="text-5xl font-semibold">
          {formatHours(result.totalMinutes)}
        </span>
        <span className="text-sm text-gray-500">total time tracked</span>
      </div>
    );
  }

  // Precompute each segment's arc length and where it starts along the
  // circumference — as plain, non-mutating derived arrays (no variable
  // reassignment during the JSX map below).
  const segmentLengths = result.slices.map(
    (slice) => (slice.minutes / result.totalMinutes) * CIRCUMFERENCE,
  );
  const segmentOffsets = segmentLengths.map((_, i) =>
    segmentLengths.slice(0, i).reduce((sum, length) => sum + length, 0),
  );

  return (
    <div className="flex flex-col items-center gap-6 text-gray-900 dark:text-white">
      <div className="relative">
        <svg
          viewBox="0 0 200 200"
          width={220}
          height={220}
          role="img"
          aria-label={`Time tracked by project, total ${formatHours(result.totalMinutes)}`}
        >
          {result.slices.map((slice, index) => {
            const segmentLength = segmentLengths[index];
            const dash = Math.max(segmentLength - SEGMENT_GAP_PX, 0);
            return (
              <circle
                key={slice.label}
                cx={100}
                cy={100}
                r={RADIUS}
                fill="none"
                stroke={sliceColor(slice.colorSlot)}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-segmentOffsets[index]}
                transform="rotate(-90 100 100)"
              >
                <title>{`${slice.label}: ${formatHours(slice.minutes)}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">
            {formatHours(result.totalMinutes)}
          </span>
          <span className="text-xs text-gray-500">total</span>
        </div>
      </div>

      <ul className="flex flex-col gap-2 text-sm">
        {result.slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: sliceColor(slice.colorSlot) }}
            />
            <span>{slice.label}</span>
            <span className="text-gray-500">{formatHours(slice.minutes)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
