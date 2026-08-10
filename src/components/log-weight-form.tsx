"use client";

import { useActionState, useEffect, useRef } from "react";
import { useToast } from "@/components/toast-provider";
import { logWeightAction, type LogWeightState } from "@/app/weight-history/actions";

const initialState: LogWeightState = { status: "idle" };

function todayLocalValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function LogWeightForm() {
  const [state, formAction] = useActionState(logWeightAction, initialState);
  const showToast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      showToast("Logged");
      formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="date">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={todayLocalValue()}
          required
          className="rounded-md border px-3 py-1.5 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="total">
          Weight
        </label>
        <input
          id="total"
          name="total"
          type="number"
          step="0.1"
          required
          className="rounded-md border px-3 py-1.5 text-sm"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground hover:opacity-90"
      >
        Log
      </button>

      {state.status === "error" && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </form>
  );
}
