"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createPostType,
  updatePostType,
  deletePostType,
  sanitizeFields,
  isValidSlug,
  type PostTypeVisibility,
} from "@/lib/post-types";

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

  const result = await createPostType({ slug, label, visibility, fields });
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
  const fields = parseFields(formData.get("fields"));

  if (!label) {
    return { status: "error", message: "Label is required." };
  }
  if (fields.length === 0) {
    return { status: "error", message: "Add at least one field." };
  }

  await updatePostType(slug, { label, visibility, fields });

  revalidatePath("/admin/post-types");
  revalidatePath(`/admin/post-types/${slug}/edit`);
  revalidatePath("/content");
  revalidatePath(`/content/${slug}`);
  return { status: "success" };
}

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
  return { status: "success" };
}
