"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef } from "@/lib/post-types";
import type { Post } from "@/lib/posts";
import { useToast } from "@/components/toast-provider";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  createPostAction,
  updatePostAction,
  startPostAction,
  uploadImageAction,
  type PostFormState,
} from "./actions";

const initialState: PostFormState = { status: "idle" };

export function PostForm({
  slug,
  fields,
  post,
  relationOptions,
}: {
  slug: string;
  fields: FieldDef[];
  post?: Post;
  relationOptions?: Record<string, { id: string; label: string }[]>;
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
          <div key={field.key} className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor={field.key}>
              {field.label}
              {effectiveField.required && " *"}
            </label>
            {renderInput(
              slug,
              effectiveField,
              post?.values[field.key],
              relationOptions?.[field.key],
            )}
          </div>
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

function renderInput(
  slug: string,
  field: FieldDef,
  value: unknown,
  relationOptions?: { id: string; label: string }[],
) {
  const common = "rounded-md border px-3 py-1.5 text-sm";

  switch (field.type) {
    case "longtext":
      return (
        <textarea
          id={field.key}
          name={field.key}
          defaultValue={typeof value === "string" ? value : ""}
          required={field.required}
          rows={4}
          className={common}
        />
      );
    case "richtext":
      return (
        <RichTextEditor
          name={field.key}
          initialValue={typeof value === "string" ? value : ""}
        />
      );
    case "number":
      return (
        <input
          id={field.key}
          name={field.key}
          type="number"
          defaultValue={typeof value === "number" ? value : undefined}
          required={field.required}
          className={common}
        />
      );
    case "date":
      return (
        <input
          id={field.key}
          name={field.key}
          type="date"
          defaultValue={typeof value === "string" ? value : ""}
          required={field.required}
          className={common}
        />
      );
    case "time":
      return (
        <input
          id={field.key}
          name={field.key}
          type="time"
          defaultValue={typeof value === "string" ? value : ""}
          required={field.required}
          className={common}
        />
      );
    case "boolean":
      return (
        <input
          id={field.key}
          name={field.key}
          type="checkbox"
          defaultChecked={value === true}
          className="h-4 w-4"
        />
      );
    case "select":
      return (
        <select
          id={field.key}
          name={field.key}
          defaultValue={typeof value === "string" ? value : ""}
          required={field.required}
          className={common}
        >
          <option value="" disabled>
            Choose...
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "relation":
      return (
        <select
          id={field.key}
          name={field.key}
          defaultValue={typeof value === "string" ? value : ""}
          required={field.required}
          className={common}
        >
          <option value="" disabled>
            Choose...
          </option>
          {(relationOptions ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "image":
      return (
        <ImageFieldInput
          slug={slug}
          fieldKey={field.key}
          value={typeof value === "string" ? value : ""}
        />
      );
    case "link":
      return (
        <input
          id={field.key}
          name={field.key}
          type="url"
          placeholder="https://..."
          defaultValue={typeof value === "string" ? value : ""}
          required={field.required}
          className={common}
        />
      );
    case "text":
    default:
      return (
        <input
          id={field.key}
          name={field.key}
          type="text"
          defaultValue={typeof value === "string" ? value : ""}
          required={field.required}
          className={common}
        />
      );
  }
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

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // matches src/lib/storage.ts

// Uploads immediately on file selection (a direct async call to the server
// action, not a form submission), independent of the surrounding post
// form — the resulting URL is carried into that form's own submission via
// a plain hidden input, so every other field type still just sees a string.
function ImageFieldInput({
  slug,
  fieldKey,
  value,
}: {
  slug: string;
  fieldKey: string;
  value: string;
}) {
  const [url, setUrl] = useState(value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Unsupported file type.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File is too large (max 8MB).");
      return;
    }

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadImageAction(slug, formData);

    setUploading(false);
    if (!result.ok || !result.url) {
      setError(result.reason ?? "Upload failed.");
      return;
    }
    setUrl(result.url);
  }

  return (
    <div className="flex flex-col gap-2">
      {url && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="h-24 w-24 rounded-md border object-cover"
          />
          <button
            type="button"
            onClick={() => setUrl("")}
            className="text-sm text-red-600 underline"
          >
            Remove
          </button>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="rounded-md border px-3 py-1.5 text-sm"
      />

      {uploading && <p className="text-sm text-gray-500">Uploading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <input type="hidden" name={fieldKey} value={url} />
    </div>
  );
}
