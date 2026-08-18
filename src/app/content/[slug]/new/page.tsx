import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPostType } from "@/lib/post-types";
import { getPost } from "@/lib/posts";
import { canEditPostType } from "@/lib/content-access";
import { PostForm } from "../PostForm";
import { buildRelationOptions } from "../relation-options";
import { DayEntriesPanel } from "../DayEntriesPanel";

export default async function NewPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ duplicateFrom?: string }>;
}) {
  const { slug } = await params;
  const { duplicateFrom } = await searchParams;
  const postType = await getPostType(slug);
  if (!postType) notFound();

  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  if (!canEditPostType(postType, session)) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-gray-600">
          Your account ({session.user.email}) can&apos;t edit{" "}
          {postType.label}.
        </p>
      </main>
    );
  }

  const relationOptions = await buildRelationOptions(postType.fields);

  // Same "first two time fields + a date field" convention used everywhere
  // else this shape matters (overlap check, timer widget, activity chart) —
  // only these post types get a "what's already logged today" panel.
  const timeFieldCount = postType.fields.filter((f) => f.type === "time").length;
  const hasDateField = postType.fields.some((f) => f.type === "date");
  const isTimeTrackerShaped = timeFieldCount >= 2 && hasDateField;

  // "Duplicate" prefills every field from the source post except its
  // time-of-day/date fields — those describe one specific occurrence
  // (and, for a time-tracker-shaped type, copying them verbatim would
  // hand the new entry the exact same slot the source already occupies,
  // tripping the overlap check on save) rather than a repeatable
  // attribute like Project/Task/Technology/Description.
  let prefillValues: Record<string, unknown> | undefined;
  if (duplicateFrom) {
    const sourcePost = await getPost(slug, duplicateFrom);
    if (sourcePost) {
      const excludedKeys = new Set(
        postType.fields
          .filter((field) => field.type === "time" || field.type === "date")
          .map((field) => field.key),
      );
      prefillValues = Object.fromEntries(
        Object.entries(sourcePost.values).filter(([key]) => !excludedKeys.has(key)),
      );
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">New {postType.label}</h1>
      {isTimeTrackerShaped && <DayEntriesPanel slug={slug} />}
      <PostForm
        slug={slug}
        fields={postType.fields}
        prefillValues={prefillValues}
        relationOptions={relationOptions}
      />
    </main>
  );
}
