"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef } from "@/lib/post-types";
import type { Post } from "@/lib/posts";
import { useToast } from "@/components/toast-provider";
import {
  createPostAction,
  updatePostAction,
  startPostAction,
  type PostFormState,
} from "./actions";
import { renderInput } from "./field-inputs";
import type { RelationFieldData } from "./relation-options";

const initialState: PostFormState = { status: "idle" };

export function PostForm({
  slug,
  fields,
  post,
  prefillValues,
  relationOptions,
}: {
  slug: string;
  fields: FieldDef[];
  post?: Post;
  // Default values for a brand-new post (e.g. "Duplicate" — see
  // [postId]/page.tsx) — only meaningful when `post` is absent, since an
  // existing post's own saved values always take precedence in edit mode.
  prefillValues?: Record<string, unknown>;
  relationOptions?: Record<string, RelationFieldData>;
}) {
  const action = post
    ? updatePostAction.bind(null, slug, post.id)
    : createPostAction.bind(null, slug);
  const [state, formAction] = useActionState(action, initialState);
  const showToast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      showToast(post ? "Saved" : "Created");
      router.push(`/content/${slug}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // The first two "Time of day" fields in schema order are treated as
  // start/end (not tied to specific keys/labels), so the timer works
  // regardless of what the admin named them.
  const timeFields = fields.filter((field) => field.type === "time");
  const startField = timeFields[0];
  const endField = timeFields[1];
  const dateField = fields.find((field) => field.type === "date");

  const startValue = startField ? post?.values[startField.key] : undefined;
  const endValue = endField ? post?.values[endField.key] : undefined;
  const isInProgress =
    !!post && typeof startValue === "string" && !!startValue && !endValue;

  // Only show the timer when creating a fresh entry, or when resuming one
  // that was started but never stopped — not on an already-completed entry,
  // which has no reason to be re-timed.
  const showTimer = startField && endField && (!post || isInProgress);

  const alreadyStartedAt =
    isInProgress && typeof startValue === "string"
      ? combineDateAndTime(
          dateField ? post?.values[dateField.key] : undefined,
          startValue,
        )
      : undefined;

  return (
    <form
      action={formAction}
      className="flex w-full max-w-2xl flex-col gap-6 rounded-md border p-6"
    >
      {showTimer && (
        <EntryTimer
          slug={slug}
          startFieldKey={startField.key}
          endFieldKey={endField.key}
          dateFieldKey={dateField?.key}
          alreadyStartedAt={alreadyStartedAt}
        />
      )}
      {fields.map((field) => {
        // Match the server-side exemption in posts.ts: while an entry is
        // still in progress, the end-time field isn't required, so the
        // browser's native validation doesn't block saving other changes
        // before you've stopped the timer.
        const isExemptEndField = isInProgress && field.key === endField?.key;
        const effectiveField = isExemptEndField
          ? { ...field, required: false }
          : field;
        return (
          <FormFieldRow
            key={field.key}
            slug={slug}
            field={effectiveField}
            value={post?.values[field.key] ?? prefillValues?.[field.key]}
            relationData={relationOptions?.[field.key]}
          />
        );
      })}
      {state.status === "error" && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
      <button
        type="submit"
        className="self-start rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground hover:opacity-90"
      >
        {post ? "Save changes" : "Create"}
      </button>
    </form>
  );
}

// Owns the "was this value set by AI Suggest?" state for one field row —
// needs to live above renderInput's call site since the icon sits next to
// the label, which is rendered separately from (and before) the input
// itself. Only relation fields with aiSuggest ever flip this to true.
function FormFieldRow({
  slug,
  field,
  value,
  relationData,
}: {
  slug: string;
  field: FieldDef;
  value: unknown;
  relationData?: RelationFieldData;
}) {
  const [aiSuggested, setAiSuggested] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label
        className="flex items-center gap-1 text-sm font-medium"
        htmlFor={field.key}
      >
        {field.label}
        {field.required && " *"}
        {aiSuggested && <span title="Set by AI suggestion">✨</span>}
      </label>
      {renderInput(slug, field, value, relationData, true, "", setAiSuggested)}
    </div>
  );
}

function formatClockValue(date: Date): string {
  return date.toTimeString().slice(0, 5); // "HH:MM", matches <input type="time">
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

// Combines a "YYYY-MM-DD" + "HH:MM" pair into a real local Date, so a
// resumed timer's elapsed time is computed from the actual recorded start
// instant rather than from in-memory state (which doesn't survive reload).
// Falls back to today if there's no date field on the schema.
function combineDateAndTime(
  dateValue: unknown,
  timeValue: string,
): string | undefined {
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return undefined;

  // Built from separate y/m/d/h/min parts (all local time) rather than via
  // `new Date("YYYY-MM-DD")` + setHours — the former parses a bare date
  // string as UTC midnight, which then disagrees with setHours' local-time
  // interpretation and silently drifts the result by the timezone offset.
  let year: number;
  let month: number; // 1-indexed
  let day: number;
  if (typeof dateValue === "string" && dateValue) {
    const parts = dateValue.split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
      return undefined;
    }
    [year, month, day] = parts;
  } else {
    const today = new Date();
    year = today.getFullYear();
    month = today.getMonth() + 1;
    day = today.getDate();
  }

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

// The entry form's start/end time inputs are uncontrolled (defaultValue
// only), so writing .value directly on Stop doesn't fight React — the value
// still submits normally with the rest of the form. Start instead submits
// the whole form through a dedicated server action that creates a real
// (intentionally incomplete) entry and navigates to its edit page, so the
// timer survives closing the browser — see startPostAction.
function EntryTimer({
  slug,
  startFieldKey,
  endFieldKey,
  dateFieldKey,
  alreadyStartedAt,
}: {
  slug: string;
  startFieldKey: string;
  endFieldKey: string;
  dateFieldKey?: string;
  alreadyStartedAt?: string;
}) {
  const initialStartedAtMs = alreadyStartedAt
    ? new Date(alreadyStartedAt).getTime()
    : null;
  const [running, setRunning] = useState(initialStartedAtMs !== null);
  // Always starts at 0 — computing the real elapsed time here would run
  // during SSR too, and Date.now() at server-render time vs. client-hydrate
  // time differ, causing a hydration mismatch. The effect below (client-only)
  // corrects it immediately on mount instead.
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(initialStartedAtMs);

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      setElapsedSeconds(
        Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000),
      );
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function handleStop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);

    const endInput = document.getElementById(
      endFieldKey,
    ) as HTMLInputElement | null;
    if (endInput) endInput.value = formatClockValue(new Date());
  }

  if (running) {
    return (
      <div
        key="running"
        className="flex items-center gap-3 rounded-md border px-4 py-3"
      >
        <button
          type="button"
          onClick={handleStop}
          className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Stop
        </button>
        <span className="font-mono text-sm text-gray-600">
          {formatElapsed(elapsedSeconds)}
        </span>
      </div>
    );
  }

  return (
    <div
      key="stopped"
      className="flex items-center gap-3 rounded-md border px-4 py-3"
    >
      <button
        type="submit"
        formAction={startPostAction.bind(null, slug, startFieldKey, dateFieldKey)}
        formNoValidate
        className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground hover:opacity-90"
      >
        Start
      </button>
    </div>
  );
}

