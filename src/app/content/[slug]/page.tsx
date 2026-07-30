import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPostType } from "@/lib/post-types";
import { listPosts } from "@/lib/posts";
import { canViewPostType, canEditPostType } from "@/lib/content-access";
import { formatFieldValue } from "./PostFieldDisplay";

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
  const titleField = postType.fields[0];

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">{postType.label}</h1>
      {editable && (
        <Link
          href={`/content/${slug}/new`}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          New {postType.label.toLowerCase()}
        </Link>
      )}
      <div className="flex w-full max-w-2xl flex-col gap-3">
        {posts.length === 0 && (
          <p className="text-sm text-gray-500">Nothing here yet.</p>
        )}
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex flex-wrap items-center gap-4 rounded-md border px-4 py-3"
          >
            <Link
              href={`/content/${slug}/${post.id}`}
              className="min-w-48 flex-1 font-medium hover:underline"
            >
              {titleField
                ? formatFieldValue(titleField.type, post.values[titleField.key])
                : post.id}
            </Link>
            {editable && (
              <Link
                href={`/content/${slug}/${post.id}/edit`}
                className="text-sm underline"
              >
                Edit
              </Link>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
