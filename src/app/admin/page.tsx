import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";

export default async function AdminPage() {
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

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Admin panel</h1>
      <p className="text-gray-600">Signed in as {session.user.email}</p>
      <Link href="/admin/users" className="text-sm text-accent hover:underline">
        Manage users
      </Link>
      <Link href="/admin/post-types" className="text-sm text-accent hover:underline">
        Manage post types
      </Link>
      <Link href="/admin/ai-settings" className="text-sm text-accent hover:underline">
        Manage AI settings
      </Link>
    </main>
  );
}
