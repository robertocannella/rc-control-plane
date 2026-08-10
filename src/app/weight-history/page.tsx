import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadWeightHistory } from "@/lib/weight-history";
import { WeightHistoryChart } from "@/components/weight-history-chart";
import { LogWeightForm } from "@/components/log-weight-form";

export default async function WeightHistoryPage() {
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

  const data = await loadWeightHistory();

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-8">
      <header>
        <h1 className="text-3xl font-semibold">Weight History</h1>
        <p className="mt-1 text-zinc-500">
          {data.length.toLocaleString()} daily readings
        </p>
      </header>

      <LogWeightForm />

      <WeightHistoryChart data={data} />
    </main>
  );
}
