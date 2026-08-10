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
        className="text-sm font-medium text-accent hover:underline"
      >
        + New post type
      </Link>
      <div className="w-full max-w-3xl overflow-x-auto rounded-md border border-border">
        {postTypes.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No post types yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2 font-medium">Label</th>
                <th className="px-4 py-2 font-medium">Slug</th>
                <th className="px-4 py-2 font-medium">Visibility</th>
                <th className="px-4 py-2 font-medium">Fields</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {postTypes.map((postType) => {
                const Icon = getPostTypeIcon(postType.icon);
                return (
                  <tr
                    key={postType.slug}
                    className="border-b border-border last:border-0 hover:bg-foreground/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {postType.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {postType.slug}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {postType.visibility}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {postType.fields.length}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/post-types/${postType.slug}/edit`}
                        className="text-accent hover:underline"
                      >
                        Edit
                      </Link>
                      <span className="mx-2 text-border">·</span>
                      <Link
                        href={`/content/${postType.slug}`}
                        className="text-accent hover:underline"
                      >
                        View content
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
