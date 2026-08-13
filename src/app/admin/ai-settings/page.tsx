import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadAiSettings } from "@/lib/ai-settings";
import { AiSettingsForm } from "./AiSettingsForm";

export default async function AiSettingsPage() {
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

  const settings = await loadAiSettings();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">AI settings</h1>
      <p className="max-w-md text-center text-sm text-gray-500">
        Used to power &ldquo;Suggest&rdquo; buttons on relation fields
        that opt into AI suggestions. The key is stored server-side only
        and never sent to the browser.
      </p>
      <AiSettingsForm
        provider={settings?.provider ?? "anthropic"}
        model={settings?.model ?? ""}
        baseUrl={settings?.baseUrl ?? ""}
        hasKey={!!settings?.apiKey}
      />
    </main>
  );
}
