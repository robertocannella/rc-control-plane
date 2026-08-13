import { firestore } from "@/lib/firestore";

export type AiProvider = "anthropic" | "openai";

export interface AiSettings {
  provider: AiProvider;
  model: string;
  baseUrl?: string;
  apiKey: string;
}

interface AiSettingsRecord {
  provider?: unknown;
  model?: unknown;
  baseUrl?: unknown;
  apiKey?: unknown;
}

// A single "current" config, not a history — same one-fixed-ID-doc
// pattern as weightGoal (see weight-history.ts) since there's only ever
// one active provider/model/key at a time. Stored in Firestore (not GCP
// Secret Manager) specifically so it's editable from the admin page
// without a redeploy; only ever read server-side, never sent to the
// client (see the admin settings page/action, which only ever expose a
// `hasKey` boolean).
function aiSettingsDoc() {
  return firestore.collection("aiSettings").doc("current");
}

function isAiProvider(value: unknown): value is AiProvider {
  return value === "anthropic" || value === "openai";
}

export async function loadAiSettings(): Promise<AiSettings | null> {
  const snapshot = await aiSettingsDoc().get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as AiSettingsRecord;

  if (!isAiProvider(data.provider)) return null;
  if (typeof data.model !== "string" || !data.model) return null;
  if (typeof data.apiKey !== "string" || !data.apiKey) return null;

  return {
    provider: data.provider,
    model: data.model,
    baseUrl: typeof data.baseUrl === "string" && data.baseUrl ? data.baseUrl : undefined,
    apiKey: data.apiKey,
  };
}

// `apiKey` omitted (or blank) keeps whatever key is already stored —
// otherwise every settings edit made from the admin form (which never
// receives the real key back) would have to re-type it or wipe it.
export async function saveAiSettings(patch: {
  provider: AiProvider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}): Promise<void> {
  const update: Record<string, unknown> = {
    provider: patch.provider,
    model: patch.model,
    baseUrl: patch.baseUrl ?? null,
    updatedAt: new Date(),
  };
  if (patch.apiKey) {
    update.apiKey = patch.apiKey;
  }
  await aiSettingsDoc().set(update, { merge: true });
}
