"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { deletePostTypeAction, type PostTypeFormState } from "./actions";

const initialState: PostTypeFormState = { status: "idle" };

export function PostTypeDeleteButton({ slug }: { slug: string }) {
  const action = deletePostTypeAction.bind(null, slug);
  const [state, formAction] = useActionState(action, initialState);
  const showToast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      showToast("Post type deleted");
      router.push("/admin/post-types");
    }
  }, [state, showToast, router]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Delete this post type? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-red-600 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
      >
        Delete post type
      </button>
      {state.status === "error" && (
        <p className="mt-2 text-sm text-red-600">{state.message}</p>
      )}
    </form>
  );
}
