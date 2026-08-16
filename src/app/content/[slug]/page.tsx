import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPostType } from "@/lib/post-types";
import { listPosts } from "@/lib/posts";
import { canViewPostType, canEditPostType } from "@/lib/content-access";
import { resolveLucideIcon } from "@/lib/post-type-icons";
import { buildTimeChartData } from "./time-chart-data";
import { TimeTrackerSection } from "./TimeTrackerSection";

// The "icons" content type is the one place a post's own field value
// (its `name`) is itself meant to be rendered as an icon — special-cased
// by slug the same way time-chart-data.ts already special-cases
// EXCLUDED_RELATION_SLUGS/PREFERRED_FIRST_SLUG, since there's no
// field-shape convention generic enough to infer "this text field is a
// Lucide icon name" from schema alone.
const ICONS_SLUG = "icons";

export default async function PostTypeContentListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const postType = await getPostType(slug);
  if (!postType) notFound();

  const session = await auth();

  if (!canViewPostType(postType, session)) {
    redirect("/");
  }

  const posts = await listPosts(slug);
  const editable = canEditPostType(postType, session);
  const chartResult = await buildTimeChartData(postType, posts, session);

  // Generic, not tied to a specific slug/label — any post type with a
  // "date" field gets range filtering on its list page, defaulting to
  // Today (see TimeTrackerSection).
  const dateField = postType.fields.find((field) => field.type === "date");

  // Same "first two time fields" convention as the timer widget and the
  // time-tracker chart — any post type shaped that way gets optional
  // Start/End/Duration columns.
  const timeFields = postType.fields.filter((field) => field.type === "time");
  const [startField, endField] = timeFields;

  const iconPreviews =
    slug === ICONS_SLUG
      ? Object.fromEntries(
          await Promise.all(
            posts.map(async (post) => {
              const Icon = await resolveLucideIcon(post.values.name);
              return [post.id, <Icon key={post.id} className="h-4 w-4 shrink-0" />] as const;
            }),
          ),
        )
      : undefined;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">{postType.label}</h1>
      <TimeTrackerSection
        slug={slug}
        postType={postType}
        posts={posts}
        editable={editable}
        dateFieldKey={dateField?.key}
        startFieldKey={startField?.key}
        endFieldKey={endField?.key}
        chartResult={chartResult}
        iconPreviews={iconPreviews}
      />
    </main>
  );
}
