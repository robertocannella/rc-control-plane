import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPostType } from "@/lib/post-types";
import { getPost } from "@/lib/posts";
import { canEditPostType } from "@/lib/content-access";
import { PostForm } from "../../PostForm";
import { buildRelationOptions } from "../../relation-options";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
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

  const post = await getPost(slug, postId);
  if (!post) notFound();

  const relationOptions = await buildRelationOptions(postType.fields);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Edit {postType.label}</h1>
      <PostForm
        slug={slug}
        fields={postType.fields}
        post={post}
        relationOptions={relationOptions}
      />
    </main>
  );
}
