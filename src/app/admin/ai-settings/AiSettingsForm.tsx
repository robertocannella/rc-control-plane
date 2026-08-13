"use client";

import { useActionState, useEffect } from "react";
import { useToast } from "@/components/toast-provider";
import { setAiSettingsAction, type AiSettingsFormState } from "./actions";
import type { AiProvider } from "@/lib/ai-settings";

const initialState: AiSettingsFormState = { status: "idle" };

export function AiSettingsForm({
  provider,
  model,
  baseUrl,
  hasKey,
}: {
  provider: AiProvider;
  model: string;
  baseUrl: string;
  hasKey: boolean;
}) {
  const [state, formAction] = useActionState(setAiSettingsAction, initialState);
  const showToast = useToast();

  useEffect(() => {
    if (state.status === "success") showToast("AI settings saved");
  }, [state, showToast]);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="provider">
          Provider
        </label>
        <select
          id="provider"
          name="provider"
          defaultValue={provider}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="model">
          Model
        </label>
        <input
          id="model"
          name="model"
          type="text"
          defaultValue={model}
          placeholder="e.g. claude-sonnet-5, gpt-4o-mini"
          required
          className="rounded-md border px-3 py-1.5 text-sm font-mono"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="baseUrl">
          Base URL <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <input
          id="baseUrl"
          name="baseUrl"
          type="text"
          defaultValue={baseUrl}
          placeholder="For an OpenAI-compatible endpoint, e.g. a self-hosted proxy"
          className="rounded-md border px-3 py-1.5 text-sm font-mono"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="apiKey">
          API key
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          placeholder={hasKey ? "Leave blank to keep the existing key" : "Required"}
          required={!hasKey}
          autoComplete="off"
          className="rounded-md border px-3 py-1.5 text-sm font-mono"
        />
        {hasKey && (
          <p className="text-xs text-gray-500">A key is already saved.</p>
        )}
      </div>

      {state.status === "error" && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <button
        type="submit"
        className="self-start rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground hover:opacity-90"
      >
        Save
      </button>
    </form>
  );
}
