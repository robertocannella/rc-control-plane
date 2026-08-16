import type { Session } from "next-auth";
import { listPostTypes } from "@/lib/post-types";
import { listPosts } from "@/lib/posts";
import { canViewPostType } from "@/lib/content-access";
import { getPostTitle } from "@/lib/post-title";

export interface RelatedPostSummary {
  id: string;
  label: string;
}

export interface RelatedPostGroup {
  sourceSlug: string;
  sourceLabel: string;
  // Only meaningful (and only shown by the UI) when a source post type has
  // more than one relation field pointing at the same target — disambiguates
  // which field the group came from. Absent otherwise, since "Time Tracker
  // (3)" reads better alone than "Time Tracker — Task (3)" in the common case.
  fieldLabel: string;
  posts: RelatedPostSummary[];
}

// The inverse of a relation field: given a post, finds every OTHER post
// (of any post type) that points AT it via a "relation" field. This is
// what makes "related items" scale to new post types automatically —
// a future "Jira Issues" or "PRs" post type with a relation field
// pointing at Tasks (or anything else) shows up here with zero code
// changes, the same way quick-add and AI-suggest already do.
//
// Respects the same privacy boundary as forward relation resolution
// (see [postId]/page.tsx's resolveRelations): a source post type the
// viewer can't see is skipped entirely, not just its titles hidden —
// its very existence as a "related" fact isn't leaked either.
export async function findRelatedPosts(
  targetSlug: string,
  targetPostId: string,
  session: Session | null,
): Promise<RelatedPostGroup[]> {
  const allPostTypes = await listPostTypes();
  const groups: RelatedPostGroup[] = [];

  for (const sourceType of allPostTypes) {
    if (!canViewPostType(sourceType, session)) continue;

    const matchingFields = sourceType.fields.filter(
      (field) => field.type === "relation" && field.relatedPostType === targetSlug,
    );
    if (matchingFields.length === 0) continue;

    const sourcePosts = await listPosts(sourceType.slug);

    for (const field of matchingFields) {
      const matches = sourcePosts.filter(
        (post) => post.values[field.key] === targetPostId,
      );
      if (matches.length === 0) continue;

      groups.push({
        sourceSlug: sourceType.slug,
        sourceLabel: sourceType.label,
        fieldLabel: field.label,
        posts: matches.map((post) => ({
          id: post.id,
          label: getPostTitle(sourceType, post),
        })),
      });
    }
  }

  return groups;
}
