// Shared by TimeTrackerSection, which filters both the list table's posts
// and the chart's facts by the same selected range. The boundary is always
// computed from the *browser's* clock, never the server's — Cloud Run runs
// UTC, and computing "today" there would silently disagree with the
// viewer's actual today near the day boundary (the exact bug already fixed
// once for the weight chart and once for this table).
export type RangeDays = number | null; // null = All

export interface RangeOption {
  label: string;
  days: RangeDays;
}

export const RANGE_OPTIONS: RangeOption[] = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All", days: null },
];

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ISO "YYYY-MM-DD" strings sort lexically the same as chronologically, so
// callers can compare directly against this without parsing a Date.
export function cutoffDateString(days: RangeDays): string | null {
  if (days === null) return null;
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - (days - 1));
  return localDateString(cutoff);
}

export function isWithinRange(value: string | null, cutoff: string | null): boolean {
  if (cutoff === null) return true;
  return typeof value === "string" && value >= cutoff;
}
