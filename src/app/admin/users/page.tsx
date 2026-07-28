import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listUsers } from "@/lib/users";
import { SCOPES } from "@/lib/scopes";
import { UserScopeForm } from "./UserScopeForm";

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
          <div
            key={user.id}
            className="flex flex-wrap items-center gap-4 rounded-md border px-4 py-3"
          >
            <div className="min-w-48 flex-1">
              <div className="font-medium">{user.name ?? user.email}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
            <UserScopeForm
              userId={user.id}
              email={user.email}
              scopes={SCOPES}
              currentScopes={user.scopes}
              isSelf={user.id === session.user.id}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
