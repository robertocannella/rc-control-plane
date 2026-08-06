"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPostType } from "@/lib/post-types";
import { createPost, updatePost, deletePost, startPost } from "@/lib/posts";
import { canEditPostType } from "@/lib/content-access";

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
