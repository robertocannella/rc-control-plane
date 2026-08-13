import type { Session } from "next-auth";
import { getPostType, type FieldDef, type PostType } from "@/lib/post-types";
import { getPost, type Post } from "@/lib/posts";
import { canViewPostType } from "@/lib/content-access";
import { getPostTitle } from "./PostFieldDisplay";
import { computeDurationMinutes } from "./duration";

// One entry per post with tracked time — pre-resolved and permission-
// checked server-side, but deliberately left unaggregated so the client can
// re-group by any selected date range (range filtering has to happen in the
// browser, not the server — see date-range.ts) without another round trip
// or re-exposing anything not already permitted.
export interface TimeChartFact {
  dateValue: string | null;
  minutes: number;
  // Only present for a dimension the viewer is actually allowed to see
  // (see TimeChartDimensionMeta.viewable) and only when this post has a
  // resolvable value for it — never populated for a non-viewable dimension.
  groups: Partial<Record<string, string>>;
}

export interface TimeChartDimensionMeta {
  fieldKey: string;
  label: string;
  viewable: boolean;
}

export type TimeChartResult =
  | { kind: "not-applicable" }
  | {
      kind: "ready";
      dimensions: TimeChartDimensionMeta[];
      facts: TimeChartFact[];
    };

// "Client" is deliberately never offered as a chart-groupable dimension —
// unlike Project/Technology, it's the field a prior privacy fix specifically
// scoped down (see the detail-page relation-resolution fix), so it's kept
// out of this UI surface entirely rather than merely visibility-gated.
const EXCLUDED_RELATION_SLUGS = new Set(["client"]);

// If a "Technology"-like dimension exists, it's the default (first) toggle —
// matches the explicit ask that Technology be the default view — everything
// else keeps its schema order.
const PREFERRED_FIRST_SLUG = "technology";

async function resolveGroupLabels(
  field: FieldDef,
  posts: Post[],
): Promise<Map<string, string> | null> {
  const relatedSlug = field.relatedPostType;
  if (!relatedSlug) return null;
  const relatedPostType = await getPostType(relatedSlug);
  if (!relatedPostType) return null;

  const ids = new Set<string>();
  for (const post of posts) {
    const value = post.values[field.key];
    if (typeof value === "string" && value) ids.add(value);
  }

  const entries = await Promise.all(
    Array.from(ids).map(async (id): Promise<[string, string]> => {
      const relatedPost = await getPost(relatedSlug, id);
      const label = relatedPost
        ? getPostTitle(relatedPostType, relatedPost)
        : "Unknown";
      return [id, label];
    }),
  );
  return new Map(entries);
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

  const dateField = postType.fields.find((field) => field.type === "date");

  const trackedPosts = posts.filter(
    (post) =>
      computeDurationMinutes(
        post.values[startField.key],
        post.values[endField.key],
      ) > 0,
  );

  const relationFields = postType.fields.filter(
    (field): field is FieldDef & { relatedPostType: string } =>
      field.type === "relation" &&
      !!field.relatedPostType &&
      !EXCLUDED_RELATION_SLUGS.has(field.relatedPostType),
  );
  relationFields.sort((a, b) => {
    if (a.relatedPostType === PREFERRED_FIRST_SLUG) return -1;
    if (b.relatedPostType === PREFERRED_FIRST_SLUG) return 1;
    return 0;
  });

  const dimensions: TimeChartDimensionMeta[] = [];
  const labelsByField = new Map<string, Map<string, string> | null>();

  for (const field of relationFields) {
    const relatedPostType = field.relatedPostType
      ? await getPostType(field.relatedPostType)
      : null;
    const viewable = !!relatedPostType && canViewPostType(relatedPostType, session);
    dimensions.push({ fieldKey: field.key, label: field.label, viewable });
    labelsByField.set(
      field.key,
      viewable ? await resolveGroupLabels(field, trackedPosts) : null,
    );
  }

  const facts: TimeChartFact[] = trackedPosts.map((post) => {
    const groups: Partial<Record<string, string>> = {};
    for (const field of relationFields) {
      const labels = labelsByField.get(field.key);
      if (!labels) continue;
      const value = post.values[field.key];
      if (typeof value === "string" && labels.has(value)) {
        groups[field.key] = labels.get(value);
      }
    }

    const dateValue = dateField ? post.values[dateField.key] : undefined;
    return {
      dateValue: typeof dateValue === "string" ? dateValue : null,
      minutes: computeDurationMinutes(
        post.values[startField.key],
        post.values[endField.key],
      ),
      groups,
    };
  });

  return { kind: "ready", dimensions, facts };
}
