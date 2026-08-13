"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  createPostType,
  updatePostType,
  deletePostType,
  sanitizeFields,
  isValidSlug,
  type PostTypeVisibility,
} from "@/lib/post-types";
import {
  isPostTypeIconName,
  DEFAULT_POST_TYPE_ICON,
  type PostTypeIconName,
} from "@/lib/post-type-icons";

export interface PostTypeFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

function parseFields(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string") return [];
  try {
    return sanitizeFields(JSON.parse(raw));
  } catch {
    return [];
  }
}

function parseVisibility(raw: FormDataEntryValue | null): PostTypeVisibility {
  return raw === "guest" || raw === "account" || raw === "editor"
    ? raw
    : "editor";
}

function parseIcon(raw: FormDataEntryValue | null): PostTypeIconName {
  return isPostTypeIconName(raw) ? raw : DEFAULT_POST_TYPE_ICON;
}

export async function createPostTypeAction(
  _prevState: PostTypeFormState,
  formData: FormData,
): Promise<PostTypeFormState> {
  const session = await auth();
  if (!session?.user?.scopes.includes("admin")) {
    return { status: "error", message: "Forbidden" };
  }

  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const label = String(formData.get("label") ?? "").trim();
  const visibility = parseVisibility(formData.get("visibility"));
  const icon = parseIcon(formData.get("icon"));
  const fields = parseFields(formData.get("fields"));

  if (!slug || !isValidSlug(slug)) {
    return {
      status: "error",
      message: "Slug must be lowercase letters, numbers, and hyphens only.",
    };
  }
  if (!label) {
    return { status: "error", message: "Label is required." };
  }
  if (fields.length === 0) {
    return { status: "error", message: "Add at least one field." };
  }

  const result = await createPostType({
    slug,
    label,
    visibility,
    icon,
    fields,
  });
  if (!result.ok) {
    return { status: "error", message: result.reason };
  }

  revalidatePath("/admin/post-types");
  revalidatePath("/content");
  return { status: "success" };
}

export async function updatePostTypeAction(
  slug: string,
  _prevState: PostTypeFormState,
  formData: FormData,
): Promise<PostTypeFormState> {
  const session = await auth();
  if (!session?.user?.scopes.includes("admin")) {
    return { status: "error", message: "Forbidden" };
  }

  const label = String(formData.get("label") ?? "").trim();
  const visibility = parseVisibility(formData.get("visibility"));
  const icon = parseIcon(formData.get("icon"));
  const fields = parseFields(formData.get("fields"));

  if (!label) {
    return { status: "error", message: "Label is required." };
  }
  if (fields.length === 0) {
    return { status: "error", message: "Add at least one field." };
  }

  await updatePostType(slug, { label, visibility, icon, fields });

  revalidatePath("/admin/post-types");
  revalidatePath(`/admin/post-types/${slug}/edit`);
  revalidatePath("/content");
  revalidatePath(`/content/${slug}`);
  return { status: "success" };
}

// Redirects server-side rather than returning success and letting the
// client push — the edit page this button lives on re-renders itself
// against fresh data as part of any form action submission, and its own
// `getPostType` would now find nothing and 404 before a client-side
// router.push ever got a chance to run (same fix as deletePostAction).
export async function deletePostTypeAction(
  slug: string,
  _prevState: PostTypeFormState,
  _formData: FormData,
): Promise<PostTypeFormState> {
  const session = await auth();
  if (!session?.user?.scopes.includes("admin")) {
    return { status: "error", message: "Forbidden" };
  }

  const result = await deletePostType(slug);
  if (!result.ok) {
    return { status: "error", message: result.reason };
  }

  revalidatePath("/admin/post-types");
  revalidatePath("/content");
  redirect("/admin/post-types");
}
