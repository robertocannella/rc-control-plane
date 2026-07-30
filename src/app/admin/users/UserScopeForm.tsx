"use client";

import { useActionState, useEffect, useRef } from "react";
import { editScopeFor, type Scope } from "@/lib/scopes";
import type { PostType } from "@/lib/post-types";
import { useToast } from "@/components/toast-provider";
import { updateUserScopes, type UpdateScopesState } from "./actions";

const initialState: UpdateScopesState = { status: "idle" };

export function UserScopeForm({
  userId,
  email,
  scopes,
  postTypes,
  currentScopes,
  isSelf,
}: {
  userId: string;
  email: string;
  scopes: readonly Scope[];
  postTypes: PostType[];
  currentScopes: Scope[];
  isSelf: boolean;
}) {
  const action = updateUserScopes.bind(null, userId);
  const [state, formAction] = useActionState(action, initialState);
  const showToast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.adminGranted) {
      showToast(`Granted admin access to ${email}`);
    } else if (state.adminRevoked) {
      showToast(`Revoked admin access from ${email}`);
    }
  }, [state, email, showToast]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Site access</span>
        {scopes.map((scope) => (
          <label key={scope} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="scopes"
              value={scope}
              defaultChecked={currentScopes.includes(scope)}
              disabled={isSelf && scope === "admin"}
              onChange={() => formRef.current?.requestSubmit()}
            />
            {scope}
          </label>
        ))}
      </div>

      {postTypes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Content access</span>
          {postTypes.map((postType) => {
            const scope = editScopeFor(postType.slug);
            return (
              <label key={scope} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="scopes"
                  value={scope}
                  defaultChecked={currentScopes.includes(scope)}
                  onChange={() => formRef.current?.requestSubmit()}
                />
                {postType.label} (edit)
              </label>
            );
          })}
        </div>
      )}

      {state.status === "error" && (
        <span className="text-sm text-red-600">{state.message}</span>
      )}
    </form>
  );
}
