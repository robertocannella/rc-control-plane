import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPostType } from "@/lib/post-types";
import { listPosts } from "@/lib/posts";
import { canViewPostType, canEditPostType } from "@/lib/content-access";
import { getPostTitle } from "./PostFieldDisplay";
import { buildTimeChartData } from "./time-chart-data";
import { TimeChart } from "./TimeChart";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

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

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">{postType.label}</h1>
      {chartResult.kind !== "not-applicable" && (
        <TimeChart result={chartResult} />
      )}
      {editable && (
        <Link
          href={`/content/${slug}/new`}
          className="text-sm font-medium text-accent hover:underline"
        >
          + New {postType.label.toLowerCase()}
        </Link>
      )}
      <div className="w-full max-w-3xl overflow-x-auto rounded-md border border-border">
        {posts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Created</th>
                {editable && <th className="px-4 py-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-border last:border-0 hover:bg-foreground/5"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/content/${slug}/${post.id}`}
                      className="font-medium hover:underline"
                    >
                      {getPostTitle(postType, post)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(post.createdAt)}
                  </td>
                  {editable && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/content/${slug}/${post.id}/edit`}
                        className="text-accent hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
