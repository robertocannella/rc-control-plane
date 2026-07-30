import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listUsers } from "@/lib/users";
import type { Scope } from "@/lib/scopes";

function ScopeSummary({ scopes }: { scopes: Scope[] }) {
  if (scopes.length === 0) {
    return <span className="text-sm text-gray-400">No access</span>;
  }

  const isAdmin = scopes.includes("admin");
  const postTypeCount = scopes.filter((scope) => scope !== "admin").length;

  return (
    <span className="text-sm text-gray-500">
      {[
        isAdmin && "Admin",
        postTypeCount > 0 &&
          `${postTypeCount} post type${postTypeCount === 1 ? "" : "s"}`,
      ]
        .filter(Boolean)
        .join(" · ")}
    </span>
  );
}

export default async function ManageUsersPage() {
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

  const users = await listUsers();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Manage users</h1>
      <div className="flex w-full max-w-2xl flex-col gap-3">
        {users.map((user) => (
          <Link
            key={user.id}
            href={`/admin/users/${user.id}`}
            className="flex flex-wrap items-center gap-4 rounded-md border px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <div className="min-w-48 flex-1">
              <div className="font-medium">{user.name ?? user.email}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
            <ScopeSummary scopes={user.scopes} />
          </Link>
        ))}
      </div>
    </main>
  );
}
