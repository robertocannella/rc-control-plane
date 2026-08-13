import type { AiSettings } from "@/lib/ai-settings";

// Plain fetch against each provider's REST API rather than pulling in
// their SDKs — both are simple enough to call directly, and this app
// otherwise has no AI dependency at all.

async function callAnthropic(
  settings: AiSettings,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch(`${settings.baseUrl ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 50,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Anthropic API returned an unexpected response shape.");
  }
  return text;
}

async function callOpenAi(
  settings: AiSettings,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch(`${settings.baseUrl ?? "https://api.openai.com"}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      // Newer models (o1/o3/gpt-5 family) reject the older `max_tokens`
      // param outright ("Unsupported parameter") and require this name
      // instead; OpenAI's chat completions endpoint accepts
      // `max_completion_tokens` across both older and newer models, so
      // it's the one name that works regardless of which model is
      // configured.
      max_completion_tokens: 50,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("OpenAI API returned an unexpected response shape.");
  }
  return text;
}

export async function callAi(
  settings: AiSettings,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  switch (settings.provider) {
    case "anthropic":
      return callAnthropic(settings, systemPrompt, userPrompt);
    case "openai":
      return callOpenAi(settings, systemPrompt, userPrompt);
  }
}
