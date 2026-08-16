"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { PostType } from "@/lib/post-types";
import type { Post } from "@/lib/posts";
import { getPostTitle } from "@/lib/post-title";
import { computeDurationMinutes, formatDurationMinutes } from "@/lib/duration";

type OptionalColumn = "start" | "end" | "duration";

const OPTIONAL_COLUMNS: { id: OptionalColumn; label: string }[] = [
  { id: "start", label: "Start" },
  { id: "end", label: "End" },
  { id: "duration", label: "Duration" },
];

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// `new Date("YYYY-MM-DD")` parses as UTC midnight, which disagrees with a
// local-time Date and can display a day off — parse the parts explicitly
// and build a local Date instead, same fix applied elsewhere in this app.
function formatDateString(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return formatDate(new Date(year, month - 1, day));
}

// Stored as 24h "HH:MM" (matches <input type="time">) — displayed as 12h
// with AM/PM for readability, since a plain table cell isn't a native time
// input that would format this for free.
function formatTimeString(value: string): string | null {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

// `posts` is expected to already be filtered to the caller's selected date
// range (range selection is shared with the chart above it — see
// TimeTrackerSection) — this component is purely presentational.
export function PostListTable({
  slug,
  postType,
  posts,
  hasAnyPosts,
  editable,
  dateFieldKey,
  startFieldKey,
  endFieldKey,
  iconPreviews,
}: {
  slug: string;
  postType: PostType;
  posts: Post[];
  hasAnyPosts: boolean;
  editable: boolean;
  dateFieldKey?: string;
  startFieldKey?: string;
  endFieldKey?: string;
  // Pre-rendered per-post icon elements (currently only the "icons"
  // content type provides these — see [slug]/page.tsx) — a component
  // reference isn't serializable across the server/client boundary, so
  // this arrives already resolved into JSX, same pattern as NavItem.icon.
  iconPreviews?: Record<string, ReactNode>;
}) {
  const hasTimeColumns = !!startFieldKey && !!endFieldKey;
  const [visibleColumns, setVisibleColumns] = useState<Set<OptionalColumn>>(
    new Set(["start", "end", "duration"]),
  );

  function toggleColumn(id: OptionalColumn) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      {hasTimeColumns && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Columns:</span>
          {OPTIONAL_COLUMNS.map((column) => (
            <label key={column.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={visibleColumns.has(column.id)}
                onChange={() => toggleColumn(column.id)}
                className="h-4 w-4"
              />
              {column.label}
            </label>
          ))}
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-md border border-border">
        {!hasAnyPosts ? (
          <p className="p-4 text-sm text-muted-foreground">Nothing here yet.</p>
        ) : posts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Nothing in this range.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">
                  {dateFieldKey ? "Date" : "Created"}
                </th>
                {hasTimeColumns && visibleColumns.has("start") && (
                  <th className="px-4 py-2 font-medium">Start</th>
                )}
                {hasTimeColumns && visibleColumns.has("end") && (
                  <th className="px-4 py-2 font-medium">End</th>
                )}
                {hasTimeColumns && visibleColumns.has("duration") && (
                  <th className="px-4 py-2 font-medium">Duration</th>
                )}
                {editable && <th className="px-4 py-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const startValue = startFieldKey
                  ? post.values[startFieldKey]
                  : undefined;
                const endValue = endFieldKey
                  ? post.values[endFieldKey]
                  : undefined;

                return (
                  <tr
                    key={post.id}
                    className="border-b border-border last:border-0 hover:bg-foreground/5"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/content/${slug}/${post.id}`}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        {iconPreviews?.[post.id]}
                        {getPostTitle(postType, post)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {dateFieldKey &&
                      typeof post.values[dateFieldKey] === "string"
                        ? formatDateString(post.values[dateFieldKey] as string)
                        : formatDate(post.createdAt)}
                    </td>
                    {hasTimeColumns && visibleColumns.has("start") && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {typeof startValue === "string"
                          ? (formatTimeString(startValue) ?? "—")
                          : "—"}
                      </td>
                    )}
                    {hasTimeColumns && visibleColumns.has("end") && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {typeof endValue === "string"
                          ? (formatTimeString(endValue) ?? "—")
                          : "—"}
                      </td>
                    )}
                    {hasTimeColumns && visibleColumns.has("duration") && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {(() => {
                          const minutes = computeDurationMinutes(
                            startValue,
                            endValue,
                          );
                          return minutes > 0
                            ? formatDurationMinutes(minutes)
                            : "—";
                        })()}
                      </td>
                    )}
                    {editable && (
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/content/${slug}/${post.id}/edit`}
                          className="text-accent hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
