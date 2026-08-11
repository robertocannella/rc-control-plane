"use client";

import { useActionState, useEffect } from "react";
import { useToast } from "@/components/toast-provider";
import {
  setWeightGoalAction,
  type SetGoalState,
} from "@/app/weight-history/actions";

const initialState: SetGoalState = { status: "idle" };

export function SetWeightGoalForm({
  currentGoal,
}: {
  currentGoal: number | null;
}) {
  const [state, formAction] = useActionState(setWeightGoalAction, initialState);
  const showToast = useToast();

  useEffect(() => {
    if (state.status === "success") {
      showToast("Goal saved");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="target">
          Goal weight
        </label>
        <input
          id="target"
          name="target"
          type="number"
          step="0.1"
          defaultValue={currentGoal ?? undefined}
          required
          className="rounded-md border px-3 py-1.5 text-sm"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground hover:opacity-90"
      >
        Save goal
      </button>

      {state.status === "error" && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </form>
  );
}
