import { readFile } from "fs/promises";
import path from "path";

export type ApiWeightEntry = {
  date: string;
  total: number;
};

export type WeightApiResponse = {
  outcome: {
    results: ApiWeightEntry[];
  };
};

export type WeightPoint = {
  date: Date;
  timestamp: number;
  total: number;
};

/**
 * The source file only carries a "M/D" label per row, no year, but it's a
 * continuous daily log that always ends today — so rows are dated by
 * counting back from today rather than parsing the label, which stays
 * correct as the file grows instead of drifting once a year boundary
 * crosses the log's start.
 */
export function normalizeWeightData(rows: ApiWeightEntry[]): WeightPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.map((row, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (rows.length - 1 - index));

    return {
      date,
      timestamp: date.getTime(),
      total: row.total,
    };
  });
}

export async function loadWeightHistory(): Promise<WeightPoint[]> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "weight-history.json",
  );
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as WeightApiResponse;
  return normalizeWeightData(parsed.outcome.results);
}
