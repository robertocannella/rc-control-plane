"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPostType } from "@/lib/post-types";
import { createPost, updatePost, deletePost, startPost, getPost, listPosts } from "@/lib/posts";
import { canEditPostType } from "@/lib/content-access";
import {
  isAllowedImageType,
  isWithinUploadSizeLimit,
  uploadImage,
} from "@/lib/storage";
import { loadAiSettings } from "@/lib/ai-settings";
import { callAi } from "@/lib/ai-provider";
import { getPostTitle } from "@/lib/post-title";

export interface PostFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function createPostAction(
  slug: string,
  _prevState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Forbidden" };

  const postType = await getPostType(slug);
  if (!postType) return { status: "error", message: "Post type not found." };
  if (!canEditPostType(postType, session)) {
    return { status: "error", message: "Forbidden" };
  }

  const result = await createPost(slug, formData, session.user.id);
  if (!result.ok) return { status: "error", message: result.reason };

  revalidatePath(`/content/${slug}`);
  return { status: "success" };
}

export async function updatePostAction(
  slug: string,
  postId: string,
  _prevState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Forbidden" };

  const postType = await getPostType(slug);
  if (!postType) return { status: "error", message: "Post type not found." };
  if (!canEditPostType(postType, session)) {
    return { status: "error", message: "Forbidden" };
  }

  const result = await updatePost(slug, postId, formData);
  if (!result.ok) return { status: "error", message: result.reason };

  revalidatePath(`/content/${slug}`);
  revalidatePath(`/content/${slug}/${postId}`);
  return { status: "success" };
}

// Used directly as a <button formAction={...}> target (bound with slug/field
// keys, leaving formData as the only argument the form submission fills in),
// not wired through useActionState — on success it just navigates away, so
// there's no state to track.
export async function startPostAction(
  slug: string,
  startFieldKey: string,
  dateFieldKey: string | undefined,
  formData: FormData,
): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const postType = await getPostType(slug);
  if (!postType || !canEditPostType(postType, session)) return;

  const result = await startPost(
    slug,
    formData,
    session.user.id,
    startFieldKey,
    dateFieldKey,
  );
  if (!result.ok) return;

  revalidatePath(`/content/${slug}`);
  redirect(`/content/${slug}/${result.id}/edit`);
}

export interface QuickCreateState {
  status: "idle" | "success" | "error";
  message?: string;
  id?: string;
  label?: string;
}

// Creates a post under a *related* post type (e.g. a new Project from the
// Project dropdown on a Time Tracker entry) without navigating away — hands
// back the new post's id/label so the dropdown that triggered it can add
// and select the option in place, unlike createPostAction which expects the
// caller to redirect on success.
export async function quickCreateRelatedPostAction(
  relatedSlug: string,
  _prevState: QuickCreateState,
  formData: FormData,
): Promise<QuickCreateState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Forbidden" };

  const relatedPostType = await getPostType(relatedSlug);
  if (!relatedPostType) {
    return { status: "error", message: "Post type not found." };
  }
  if (!canEditPostType(relatedPostType, session)) {
    return { status: "error", message: "Forbidden" };
  }

  const result = await createPost(relatedSlug, formData, session.user.id);
  if (!result.ok) return { status: "error", message: result.reason };

  const created = await getPost(relatedSlug, result.id);
  const label = created ? getPostTitle(relatedPostType, created) : "Untitled";

  revalidatePath(`/content/${relatedSlug}`);
  return { status: "success", id: result.id, label };
}

export interface SuggestRelationState {
  status: "idle" | "success" | "error";
  message?: string;
  id?: string;
  label?: string;
}

// Asks the admin-configured AI provider to pick the best-matching option
// for a relation field, given the rest of the entry's currently-typed
// values — generic to any relation field with `aiSuggest` enabled, not
// tied to a specific post type/field key. Invoked directly from the
// client (not through a <form action>), same pattern as
// uploadImageAction, since it's a side action alongside the real submit.
export async function suggestRelationValueAction(
  slug: string,
  fieldKey: string,
  _prevState: SuggestRelationState,
  formData: FormData,
): Promise<SuggestRelationState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Forbidden" };

  const postType = await getPostType(slug);
  if (!postType) return { status: "error", message: "Post type not found." };
  if (!canEditPostType(postType, session)) {
    return { status: "error", message: "Forbidden" };
  }

  const field = postType.fields.find(
    (f) => f.key === fieldKey && f.type === "relation" && f.aiSuggest && f.relatedPostType,
  );
  if (!field || !field.relatedPostType) {
    return { status: "error", message: "AI suggestions aren't enabled for this field." };
  }

  const settings = await loadAiSettings();
  if (!settings) {
    return {
      status: "error",
      message: "AI isn't configured — set it up in Admin → AI Settings.",
    };
  }

  const relatedPostType = await getPostType(field.relatedPostType);
  if (!relatedPostType) {
    return { status: "error", message: "Related post type not found." };
  }
  const relatedPosts = await listPosts(field.relatedPostType);
  // Every text-ish field on the related post type besides the title
  // itself (fields[0], per getPostTitle's convention) — e.g. R&D
  // Categories' "Examples" field — carries real disambiguating signal
  // the AI should see, not just the bare title.
  const descriptiveFields = relatedPostType.fields.filter(
    (f, index) =>
      index !== 0 &&
      (f.type === "text" || f.type === "longtext" || f.type === "richtext"),
  );
  const candidates = relatedPosts.map((post) => {
    const descriptionParts: string[] = [];
    for (const f of descriptiveFields) {
      const raw = post.values[f.key];
      if (typeof raw !== "string" || !raw.trim()) continue;
      const text = f.type === "richtext" ? raw.replace(/<[^>]*>/g, " ").trim() : raw.trim();
      if (text) descriptionParts.push(`${f.label}: ${text}`);
    }
    return {
      id: post.id,
      label: getPostTitle(relatedPostType, post),
      description: descriptionParts.join(" | "),
    };
  });
  if (candidates.length === 0) {
    return { status: "error", message: "No options to suggest from yet." };
  }

  const contextLines: string[] = [];
  for (const other of postType.fields) {
    if (other.key === fieldKey) continue;
    if (other.type !== "text" && other.type !== "longtext" && other.type !== "richtext") {
      continue;
    }
    const value = formData.get(other.key);
    if (typeof value === "string" && value.trim()) {
      contextLines.push(`${other.label}: ${value.trim()}`);
    }
  }

  const systemPrompt =
    "You are helping classify a form entry into one of a fixed set of " +
    "options. Reply with ONLY the id of the single best-matching option " +
    "below, and nothing else — no explanation, no punctuation.";
  const userPrompt = [
    contextLines.length > 0 ? contextLines.join("\n") : "(no additional details provided)",
    "",
    "Options:",
    ...candidates.map((c) =>
      c.description ? `${c.id}: ${c.label} — ${c.description}` : `${c.id}: ${c.label}`,
    ),
  ].join("\n");

  let raw: string;
  try {
    raw = await callAi(settings, systemPrompt, userPrompt);
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "AI request failed.",
    };
  }

  const answer = raw.trim();
  const match = candidates.find((c) => c.id === answer);
  if (!match) {
    return {
      status: "error",
      message: "AI's answer didn't match a known option — pick manually.",
    };
  }

  return { status: "success", id: match.id, label: match.label };
}

export interface UploadImageState {
  ok: boolean;
  url?: string;
  reason?: string;
}

// Invoked directly as an async function call from the client (not through a
// <form action>), so a single field's file picker can upload immediately on
// selection without submitting the rest of the post form.
export async function uploadImageAction(
  slug: string,
  formData: FormData,
): Promise<UploadImageState> {
  const session = await auth();
  if (!session?.user) return { ok: false, reason: "Forbidden" };

  const postType = await getPostType(slug);
  if (!postType) return { ok: false, reason: "Post type not found." };
  if (!canEditPostType(postType, session)) {
    return { ok: false, reason: "Forbidden" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, reason: "No file selected." };
  }
  if (!isAllowedImageType(file.type)) {
    return { ok: false, reason: "Unsupported file type." };
  }
  if (!isWithinUploadSizeLimit(file.size)) {
    return { ok: false, reason: "File is too large (max 8MB)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadImage(buffer, file.type, slug);
  return { ok: true, url };
}

// Redirects server-side (like startPostAction) rather than returning
// success and letting the client push — the page that invoked this
// (detail or edit) re-renders itself against fresh data as part of any
// form action submission, and that page's own `getPost` would now find
// nothing and 404 before a client-side router.push ever got a chance to
// run. redirect() preempts that race entirely.
export async function deletePostAction(
  slug: string,
  postId: string,
  _prevState: PostFormState,
  _formData: FormData,
): Promise<PostFormState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Forbidden" };

  const postType = await getPostType(slug);
  if (!postType) return { status: "error", message: "Post type not found." };
  if (!canEditPostType(postType, session)) {
    return { status: "error", message: "Forbidden" };
  }

  await deletePost(slug, postId);
  revalidatePath(`/content/${slug}`);
  redirect(`/content/${slug}`);
}
