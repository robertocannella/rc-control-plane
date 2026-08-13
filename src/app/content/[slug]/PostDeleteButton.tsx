"use client";

import { useActionState } from "react";
import { deletePostAction, type PostFormState } from "./actions";

const initialState: PostFormState = { status: "idle" };

// On success, deletePostAction redirects server-side rather than
// returning — so there's no "success" state to react to here, only the
// error path (Forbidden, etc.) stays client-visible.
export function PostDeleteButton({
  slug,
  postId,
}: {
  slug: string;
  postId: string;
}) {
  const action = deletePostAction.bind(null, slug, postId);
  const [state, formAction] = useActionState(action, initialState);

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
