import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listUsers } from "@/lib/users";
import type { Scope } from "@/lib/scopes";

function ScopeSummary({ scopes }: { scopes: Scope[] }) {
  if (scopes.length === 0) {
    return <span className="text-muted-foreground">No access</span>;
  }

  const isAdmin = scopes.includes("admin");
  const postTypeCount = scopes.filter((scope) => scope !== "admin").length;

  return (
    <span className="text-muted-foreground">
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
      <div className="w-full max-w-3xl overflow-x-auto rounded-md border border-border">
        {users.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border text-sm last:border-0 hover:bg-foreground/5"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium hover:underline"
                    >
                      {user.name ?? user.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <ScopeSummary scopes={user.scopes} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
