"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPostType } from "@/lib/post-types";
import { createPost, updatePost, deletePost, startPost, getPost } from "@/lib/posts";
import { canEditPostType } from "@/lib/content-access";
import {
  isAllowedImageType,
  isWithinUploadSizeLimit,
  uploadImage,
} from "@/lib/storage";
import { getPostTitle } from "./PostFieldDisplay";

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
  return { status: "success" };
}
