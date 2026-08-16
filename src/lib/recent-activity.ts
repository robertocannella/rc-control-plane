import type { Session } from "next-auth";
import { listPostTypes } from "@/lib/post-types";
import { listPosts } from "@/lib/posts";
import { canViewPostType } from "@/lib/content-access";

export interface ActivityFact {
  postTypeSlug: string;
  postTypeLabel: string;
  // Raw timestamp, not a pre-bucketed day — bucketing into "N days ago"
  // has to happen client-side against the viewer's own clock (Cloud Run
  // runs UTC, and computing "today" server-side would silently disagree
  // with the viewer's actual today near the day boundary — the same bug
  // already fixed for the weight chart and the content list's date
  // range, see content/[slug]/date-range.ts).
  updatedAtMs: number;
}

// Every post the viewer can see, across every post type, flattened into
// a single unaggregated list — deliberately not filtered by "recent"
// here so the client-side chart can be widened/narrowed later without a
// server round trip. Respects the same visibility rule as everywhere
// else content is listed.
export async function buildRecentActivityFacts(
  session: Session | null,
): Promise<ActivityFact[]> {
  const postTypes = (await listPostTypes()).filter((postType) =>
    canViewPostType(postType, session),
  );

  const facts: ActivityFact[] = [];
  for (const postType of postTypes) {
    const posts = await listPosts(postType.slug);
    for (const post of posts) {
      facts.push({
        postTypeSlug: postType.slug,
        postTypeLabel: postType.label,
        updatedAtMs: post.updatedAt.getTime(),
      });
    }
  }
  return facts;
}
