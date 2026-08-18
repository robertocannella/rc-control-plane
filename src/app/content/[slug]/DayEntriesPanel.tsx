"use client";

import { useEffect, useState } from "react";
import { listDayEntriesAction, type DayEntry } from "./actions";

// "Today" is always computed from the browser's clock, never the server's —
// Cloud Run runs UTC, so a server-side "today" would be wrong for most of
// the day for a US-based user.
function todayDateValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DayEntriesPanel({ slug }: { slug: string }) {
  const [entries, setEntries] = useState<DayEntry[] | null>(null);

  useEffect(() => {
    listDayEntriesAction(slug, todayDateValue()).then(setEntries);
  }, [slug]);

  // Stay silent while loading rather than flashing an empty state first.
  if (entries === null) return null;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2 rounded-md border border-border px-4 py-3">
      <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
        Today&apos;s entries
      </span>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing logged yet today.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-baseline justify-between gap-4"
            >
              <span>{entry.title}</span>
              <span className="shrink-0 font-mono text-gray-500">
                {entry.start}–{entry.end}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
