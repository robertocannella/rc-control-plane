import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listPostTypes } from "@/lib/post-types";
import { canViewPostType, canEditPostType } from "@/lib/content-access";

export default async function ContentHubPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const postTypes = (await listPostTypes()).filter((postType) =>
    canViewPostType(postType, session),
  );

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Content</h1>
      {postTypes.length === 0 ? (
        <p className="text-sm text-gray-500">No post types yet.</p>
      ) : (
        <div className="flex w-full max-w-2xl flex-col gap-3">
          {postTypes.map((postType) => (
            <Link
              key={postType.slug}
              href={`/content/${postType.slug}`}
              className="flex items-center gap-4 rounded-md border px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <div className="flex-1">
                <div className="font-medium">{postType.label}</div>
                <div className="text-sm text-gray-500">
                  {postType.visibility}
                  {canEditPostType(postType, session) ? " · editor" : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
