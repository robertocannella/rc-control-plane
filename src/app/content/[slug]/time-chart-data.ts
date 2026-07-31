import type { Session } from "next-auth";
import { getPostType, type PostType } from "@/lib/post-types";
import { getPost, type Post } from "@/lib/posts";
import { canViewPostType } from "@/lib/content-access";
import { getPostTitle } from "./PostFieldDisplay";

export interface TimeChartSlice {
  label: string;
  minutes: number;
  colorSlot: 0 | 1 | 2 | -1; // -1 == "Other"
}

export type TimeChartResult =
  | { kind: "not-applicable" }
  | { kind: "empty" }
  | { kind: "total-only"; totalMinutes: number }
  | { kind: "chart"; totalMinutes: number; slices: TimeChartSlice[] };

const MAX_NAMED_SLICES = 3;

function computeDurationMinutes(start: unknown, end: unknown): number {
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
  let minutes =
    endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  if (minutes < 0) minutes += 24 * 60; // crossed midnight
  return minutes;
}

export async function buildTimeChartData(
  postType: PostType,
  posts: Post[],
  session: Session | null,
): Promise<TimeChartResult> {
  // The first two "Time of day" fields in schema order are treated as
  // start/end — same convention as the entry form's timer widget — not
  // tied to specific keys/labels, so it works regardless of what the admin
  // named them.
  const timeFields = postType.fields.filter((field) => field.type === "time");
  const [startField, endField] = timeFields;
  if (!startField || !endField) {
    return { kind: "not-applicable" };
  }

  const durations = posts
    .map((post) => ({
      post,
      minutes: computeDurationMinutes(
        post.values[startField.key],
        post.values[endField.key],
      ),
    }))
    .filter((d) => d.minutes > 0);

  const totalMinutes = durations.reduce((sum, d) => sum + d.minutes, 0);
  if (totalMinutes === 0) {
    return { kind: "empty" };
  }

  const groupField = postType.fields.find((field) => field.type === "relation");
  const relatedSlug = groupField?.relatedPostType;
  const relatedPostType = relatedSlug ? await getPostType(relatedSlug) : null;

  // Only reveal project names to a viewer who could actually view the
  // related post type themselves — not hardcoded to "guest", so this stays
  // correct for a signed-in viewer without access too.
  if (
    !relatedSlug ||
    !groupField ||
    !relatedPostType ||
    !canViewPostType(relatedPostType, session)
  ) {
    return { kind: "total-only", totalMinutes };
  }

  const minutesByRelatedId = new Map<string, number>();
  for (const { post, minutes } of durations) {
    const relatedId = post.values[groupField.key];
    if (typeof relatedId !== "string" || !relatedId) continue;
    minutesByRelatedId.set(
      relatedId,
      (minutesByRelatedId.get(relatedId) ?? 0) + minutes,
    );
  }

  const named = await Promise.all(
    Array.from(minutesByRelatedId.entries()).map(async ([id, minutes]) => {
      const relatedPost = await getPost(relatedSlug, id);
      const label = relatedPost
        ? getPostTitle(relatedPostType, relatedPost)
        : "Unknown";
      return { label, minutes };
    }),
  );
  named.sort((a, b) => b.minutes - a.minutes);

  const top = named
    .slice(0, MAX_NAMED_SLICES)
    .map((entry, index): TimeChartSlice => ({
      ...entry,
      colorSlot: index as 0 | 1 | 2,
    }));
  const overflowMinutes = named
    .slice(MAX_NAMED_SLICES)
    .reduce((sum, entry) => sum + entry.minutes, 0);

  const slices = [...top];
  if (overflowMinutes > 0) {
    slices.push({ label: "Other", minutes: overflowMinutes, colorSlot: -1 });
  }

  return { kind: "chart", totalMinutes, slices };
}
