import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listPostTypes } from "@/lib/post-types";
import { getPostTypeIcon } from "@/lib/post-type-icons";

export default async function PostTypesPage() {
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

  const postTypes = await listPostTypes();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Post types</h1>
      <Link
        href="/admin/post-types/new"
        className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
      >
        New post type
      </Link>
      <div className="flex w-full max-w-2xl flex-col gap-3">
        {postTypes.length === 0 && (
          <p className="text-sm text-gray-500">No post types yet.</p>
        )}
        {postTypes.map((postType) => {
          const Icon = getPostTypeIcon(postType.icon);
          return (
            <div
              key={postType.slug}
              className="flex flex-wrap items-center gap-4 rounded-md border px-4 py-3"
            >
              <Icon className="h-5 w-5 shrink-0 text-gray-500" />
              <div className="min-w-48 flex-1">
                <div className="font-medium">{postType.label}</div>
                <div className="text-sm text-gray-500">
                  <span className="font-mono">{postType.slug}</span> ·{" "}
                  {postType.visibility} · {postType.fields.length} field
                  {postType.fields.length === 1 ? "" : "s"}
                </div>
              </div>
              <Link
                href={`/admin/post-types/${postType.slug}/edit`}
                className="text-sm underline"
              >
                Edit
              </Link>
              <Link
                href={`/content/${postType.slug}`}
                className="text-sm underline"
              >
                View content
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}
