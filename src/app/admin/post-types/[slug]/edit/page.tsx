import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPostType, listPostTypes } from "@/lib/post-types";
import { listPosts } from "@/lib/posts";
import { PostTypeForm } from "../../PostTypeForm";
import { PostTypeDeleteButton } from "../../PostTypeDeleteButton";
import { buildIconPickerOptions } from "../../icon-options";

export default async function EditPostTypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (!session.user.scopes.includes("admin")) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-gray-600">
          Your account ({session.user.email}) doesn&apos;t have admin access.
        </p>
      </main>
    );
  }

  const postType = await getPostType(slug);
  if (!postType) {
    notFound();
  }

  const postTypes = await listPostTypes();
  const posts = await listPosts(slug);
  const iconOptions = await buildIconPickerOptions(postType.icon);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Edit {postType.label}</h1>
      <PostTypeForm
        mode="edit"
        postType={postType}
        postTypes={postTypes}
        iconOptions={iconOptions}
      />
      <PostTypeDeleteButton slug={postType.slug} postCount={posts.length} />
    </main>
  );
}
