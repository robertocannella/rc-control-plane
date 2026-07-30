"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { deletePostAction, type PostFormState } from "./actions";

const initialState: PostFormState = { status: "idle" };

export function PostDeleteButton({
  slug,
  postId,
}: {
  slug: string;
  postId: string;
}) {
  const action = deletePostAction.bind(null, slug, postId);
  const [state, formAction] = useActionState(action, initialState);
  const showToast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      showToast("Deleted");
      router.push(`/content/${slug}`);
    }
  }, [state, showToast, router, slug]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Delete this? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm text-red-600 underline">
        Delete
      </button>
      {state.status === "error" && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </form>
  );
}
