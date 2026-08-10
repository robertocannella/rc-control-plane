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

// `new Date("YYYY-MM-DD")` parses as UTC midnight, which disagrees with the
// local-time constructor used everywhere else in the app and can silently
// shift the point by a day — parse the parts explicitly instead.
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
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
