import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getUser } from "@/lib/users";
import { SCOPES } from "@/lib/scopes";
import { listPostTypes } from "@/lib/post-types";
import { UserScopeForm } from "../UserScopeForm";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
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

  const user = await getUser(userId);
  if (!user) notFound();

  const postTypes = await listPostTypes();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <Link href="/admin/users" className="self-start text-sm underline">
        ← All users
      </Link>
      <div className="flex w-full max-w-2xl flex-col gap-1">
        <h1 className="text-2xl font-semibold">{user.name ?? user.email}</h1>
        <p className="text-gray-600">{user.email}</p>
      </div>
      <div className="w-full max-w-2xl rounded-md border px-4 py-4">
        <UserScopeForm
          userId={user.id}
          email={user.email}
          scopes={SCOPES}
          postTypes={postTypes}
          currentScopes={user.scopes}
          isSelf={user.id === session.user.id}
        />
      </div>
    </main>
  );
}
