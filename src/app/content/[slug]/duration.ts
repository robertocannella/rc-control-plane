// Shared by anything that reads a schema's first two "time of day" fields
// as a start/end pair (the timer widget, the time-tracker chart, and the
// list page's optional Start/End/Duration columns) — same convention
// throughout: not tied to specific field keys/labels.
export function computeDurationMinutes(start: unknown, end: unknown): number {
  if (typeof start !== "string" || typeof end !== "string") return 0;
  const [startHours, startMinutes] = start.split(":").map(Number);
  const [endHours, endMinutes] = end.split(":").map(Number);
  if (
    [startHours, startMinutes, endHours, endMinutes].some((n) =>
      Number.isNaN(n),
    )
  ) {
    return 0;
  }
  let minutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  if (minutes < 0) minutes += 24 * 60; // crossed midnight
  return minutes;
}

export function formatDurationMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
