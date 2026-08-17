import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import { getPostType, type FieldDef } from "@/lib/post-types";
import { getPost } from "@/lib/posts";
import { canViewPostType, canEditPostType } from "@/lib/content-access";
import { getPostTitle } from "@/lib/post-title";
import { findRelatedPosts } from "@/lib/related-posts";
import {
  PostFieldDisplay,
  type ResolvedRelationDisplay,
} from "../PostFieldDisplay";
import { PostDeleteButton } from "../PostDeleteButton";

async function resolveRelations(
  fields: FieldDef[],
  values: Record<string, unknown>,
  session: Session | null,
): Promise<Record<string, ResolvedRelationDisplay>> {
  const resolved: Record<string, ResolvedRelationDisplay> = {};

  for (const field of fields) {
    if (field.type !== "relation" || !field.relatedPostType) continue;
    const relatedId = values[field.key];
    if (typeof relatedId !== "string" || !relatedId) continue;

    const relatedPostType = await getPostType(field.relatedPostType);
    if (!relatedPostType) {
      resolved[field.key] = { kind: "missing" };
      continue;
    }

    // Never reveal a related post's title/link to a viewer who couldn't
    // view that post type themselves — this is what the site owner's own
    // per-post-type visibility setting is supposed to guarantee.
    if (!canViewPostType(relatedPostType, session)) {
      resolved[field.key] = { kind: "hidden" };
      continue;
    }

    const relatedPost = await getPost(field.relatedPostType, relatedId);
    resolved[field.key] = relatedPost
      ? {
          kind: "visible",
          label: getPostTitle(relatedPostType, relatedPost),
          href: `/content/${field.relatedPostType}/${relatedId}`,
        }
      : { kind: "missing" };
  }

  return resolved;
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  const postType = await getPostType(slug);
  if (!postType) notFound();

  const session = await auth();
  if (!canViewPostType(postType, session)) {
    redirect("/");
  }

  const post = await getPost(slug, postId);
  if (!post) notFound();

  const editable = canEditPostType(postType, session);

  // Description fields are hidden from signed-out visitors regardless of
  // the post type's own visibility setting — e.g. Time Tracker is
  // "guest" visible (so its list/detail pages are reachable without
  // signing in), but entry descriptions can contain client/work details
  // not meant for anonymous viewers. Matches on the field key (the
  // stable, always-lowercase identifier), not the label, since this app
  // already uses "description" as its consistent key for this field
  // across every post type that has one.
  const visibleFields = session?.user
    ? postType.fields
    : postType.fields.filter((field) => field.key !== "description");

  const resolvedRelations = await resolveRelations(
    visibleFields,
    post.values,
    session,
  );
  const relatedGroups = await findRelatedPosts(slug, post.id, session);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <div className="flex w-full max-w-2xl items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{postType.label}</h1>
        {editable && (
          <div className="flex shrink-0 items-center gap-4">
            <Link
              href={`/content/${slug}/${post.id}/edit`}
              className="text-sm text-accent hover:underline"
            >
              Edit
            </Link>
            <PostDeleteButton slug={slug} postId={post.id} />
          </div>
        )}
      </div>
      <div className="flex w-full max-w-2xl flex-col divide-y divide-border rounded-md border border-border">
        {visibleFields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1 px-4 py-3">
            <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              {field.label}
            </span>
            <PostFieldDisplay
              field={field}
              value={post.values[field.key]}
              resolved={resolvedRelations[field.key]}
            />
          </div>
        ))}
      </div>

      {relatedGroups.length > 0 && (
        <div className="flex w-full max-w-2xl flex-col gap-4">
          <h2 className="text-lg font-semibold">Related</h2>
          {relatedGroups.map((group, index) => {
            // Only disambiguate with the field label when this source post
            // type shows up more than once (e.g. two different relation
            // fields on it both pointing here) — the common case of one
            // field per source type reads better without it.
            const isAmbiguous =
              relatedGroups.filter((g) => g.sourceSlug === group.sourceSlug).length > 1;
            return (
              <div
                key={`${group.sourceSlug}-${group.fieldLabel}-${index}`}
                className="flex flex-col gap-2 rounded-md border border-border px-4 py-3"
              >
                <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                  {group.sourceLabel}
                  {isAmbiguous ? ` — ${group.fieldLabel}` : ""} ({group.posts.length})
                </span>
                <ul className="flex flex-col gap-1">
                  {group.posts.map((related) => (
                    <li key={related.id}>
                      <Link
                        href={`/content/${group.sourceSlug}/${related.id}`}
                        className="underline"
                      >
                        {related.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
