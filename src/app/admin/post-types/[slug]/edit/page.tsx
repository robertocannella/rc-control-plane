import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPostType } from "@/lib/post-types";
import { PostTypeForm } from "../../PostTypeForm";
import { PostTypeDeleteButton } from "../../PostTypeDeleteButton";

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

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Edit {postType.label}</h1>
      <PostTypeForm mode="edit" postType={postType} />
      <PostTypeDeleteButton slug={postType.slug} />
    </main>
  );
}
