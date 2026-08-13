"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { saveAiSettings, type AiProvider } from "@/lib/ai-settings";

export interface AiSettingsFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

function isAiProvider(value: unknown): value is AiProvider {
  return value === "anthropic" || value === "openai";
}

export async function setAiSettingsAction(
  _prevState: AiSettingsFormState,
  formData: FormData,
): Promise<AiSettingsFormState> {
  const session = await auth();
  if (!session?.user?.scopes.includes("admin")) {
    return { status: "error", message: "Forbidden" };
  }

  const provider = formData.get("provider");
  const model = formData.get("model");
  const baseUrl = formData.get("baseUrl");
  const apiKey = formData.get("apiKey");

  if (!isAiProvider(provider)) {
    return { status: "error", message: "Choose a provider." };
  }
  if (typeof model !== "string" || !model.trim()) {
    return { status: "error", message: "Model is required." };
  }

  await saveAiSettings({
    provider,
    model: model.trim(),
    baseUrl: typeof baseUrl === "string" && baseUrl.trim() ? baseUrl.trim() : undefined,
    apiKey: typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : undefined,
  });

  revalidatePath("/admin/ai-settings");
  return { status: "success" };
}
