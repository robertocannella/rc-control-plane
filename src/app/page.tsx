import Image from "next/image";
import Link from "next/link";
import { auth, signIn } from "@/auth";
import { Shield } from "lucide-react";
import { listPostTypes } from "@/lib/post-types";
import { canViewPostType } from "@/lib/content-access";
import { getPostTypeIcon } from "@/lib/post-type-icons";

export default async function Home() {
  const session = await auth();

  const postTypes = (await listPostTypes()).filter((postType) =>
    canViewPostType(postType, session),
  );

  if (!session?.user) {
    return (
      <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
        <div className="flex flex-col items-center gap-6">
          <h1 className="text-2xl font-semibold">Roberto Cannella</h1>
          <h2 className="text-lg text-muted-foreground">Docs, Ideas, and Tools.</h2>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-accent-foreground hover:opacity-90"
            >
              Sign in with Google
            </button>
          </form>
        </div>

        {postTypes.length > 0 && (
          <div className="flex w-full max-w-2xl flex-col gap-3">
            {postTypes.map((postType) => {
              const Icon = getPostTypeIcon(postType.icon);
              return (
                <Link
                  key={postType.slug}
                  href={`/content/${postType.slug}`}
                  className="flex items-center gap-4 rounded-md border border-border px-4 py-3 hover:bg-foreground/5"
                >
                  <Icon className="h-5 w-5 shrink-0 text-gray-500" />
                  <div className="font-medium">{postType.label}</div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <div className="flex flex-col items-center gap-4">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "User avatar"}
            width={64}
            height={64}
            className="rounded-full"
          />
        )}
        <p className="text-lg">Signed in as {session.user.email}</p>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-3">
        {postTypes.map((postType) => {
          const Icon = getPostTypeIcon(postType.icon);
          return (
            <Link
              key={postType.slug}
              href={`/content/${postType.slug}`}
              className="flex items-center gap-4 rounded-md border border-border px-4 py-3 hover:bg-foreground/5"
            >
              <Icon className="h-5 w-5 shrink-0 text-gray-500" />
              <div className="font-medium">{postType.label}</div>
            </Link>
          );
        })}
        {session.user.scopes.includes("admin") && (
          <Link
            href="/admin"
            className="flex items-center gap-4 rounded-md border border-border px-4 py-3 hover:bg-foreground/5"
          >
            <Shield className="h-5 w-5 shrink-0 text-gray-500" />
            <div className="font-medium">Admin</div>
          </Link>
        )}
      </div>
    </main>
  );
}
