"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Scope } from "@/lib/scopes";
import { useToast } from "@/components/toast-provider";
import { updateUserScopes, type UpdateScopesState } from "./actions";

const initialState: UpdateScopesState = { status: "idle" };

export function UserScopeForm({
  userId,
  email,
  scopes,
  currentScopes,
  isSelf,
}: {
  userId: string;
  email: string;
  scopes: readonly Scope[];
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
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-center gap-4"
    >
      {scopes.map((scope) => (
        <label key={scope} className="flex items-center gap-1 text-sm">
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
      {state.status === "error" && (
        <span className="text-sm text-red-600">{state.message}</span>
      )}
    </form>
  );
}
