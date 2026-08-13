"use client";

import { useActionState } from "react";
import { deletePostTypeAction, type PostTypeFormState } from "./actions";

const initialState: PostTypeFormState = { status: "idle" };

// On success, deletePostTypeAction redirects server-side rather than
// returning — so there's no "success" state to react to here, only the
// error path stays client-visible.
export function PostTypeDeleteButton({
  slug,
  postCount,
}: {
  slug: string;
  postCount: number;
}) {
  const action = deletePostTypeAction.bind(null, slug);
  const [state, formAction] = useActionState(action, initialState);

  const warning =
    postCount > 0
      ? `Delete this post type and all ${postCount} post${postCount === 1 ? "" : "s"} under it? This can't be undone.`
      : "Delete this post type? This can't be undone.";

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(warning)) {
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
