import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPostType } from "@/lib/post-types";
import { getPost } from "@/lib/posts";
import { canViewPostType, canEditPostType } from "@/lib/content-access";
import { PostFieldDisplay } from "../PostFieldDisplay";
import { PostDeleteButton } from "../PostDeleteButton";

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

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">{postType.label}</h1>
      <div className="flex w-full max-w-2xl flex-col gap-4">
        {postType.fields.map((field) => (
          <div key={field.key}>
            <div className="text-sm font-medium">{field.label}</div>
            <PostFieldDisplay field={field} value={post.values[field.key]} />
          </div>
        ))}
      </div>
      {editable && (
        <div className="flex gap-4">
          <Link
            href={`/content/${slug}/${post.id}/edit`}
            className="text-sm underline"
          >
            Edit
          </Link>
          <PostDeleteButton slug={slug} postId={post.id} />
        </div>
      )}
    </main>
  );
}
