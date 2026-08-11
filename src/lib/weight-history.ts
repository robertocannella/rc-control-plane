import { firestore } from "@/lib/firestore";

export type WeightPoint = {
  date: Date;
  timestamp: number;
  total: number;
};

interface WeightEntryRecord {
  date: string; // "YYYY-MM-DD", also the document ID
  total: number;
}

function weightEntriesCollection() {
  return firestore.collection("weightEntries");
}

// These are calendar dates with no time-of-day meaning (a daily weight
// reading), so the resulting timestamp is anchored to UTC midnight rather
// than the server's local timezone — Cloud Run runs in UTC, but a viewer
// in another timezone reading the timestamp back would otherwise see it
// silently roll back a day (server-local UTC midnight rendered in, say,
// US Eastern lands the evening before). The chart's own date formatting
// (weight-history-chart.tsx) matches this by also formatting in UTC.
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatLocalDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function loadWeightHistory(): Promise<WeightPoint[]> {
  const snapshot = await weightEntriesCollection().orderBy("date", "asc").get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as WeightEntryRecord;
    const date = parseLocalDate(data.date);
    return { date, timestamp: date.getTime(), total: data.total };
  });
}

// Keyed by date so re-logging the same day overwrites instead of
// duplicating, rather than an auto-generated ID.
export async function logWeightEntry(date: string, total: number): Promise<void> {
  await weightEntriesCollection()
    .doc(date)
    .set({ date, total, updatedAt: new Date() });
}

// A single scalar target, not a history — one fixed-ID doc rather than a
// collection, matching how there's only ever one "current" goal.
function weightGoalDoc() {
  return firestore.collection("weightGoal").doc("current");
}

export async function loadWeightGoal(): Promise<number | null> {
  const snapshot = await weightGoalDoc().get();
  if (!snapshot.exists) return null;
  const target = snapshot.data()?.target;
  return typeof target === "number" ? target : null;
}

export async function setWeightGoal(target: number): Promise<void> {
  await weightGoalDoc().set({ target, updatedAt: new Date() });
}
