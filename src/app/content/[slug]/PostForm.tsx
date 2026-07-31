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

  return (
    <form
      action={formAction}
      className="flex w-full max-w-2xl flex-col gap-6 rounded-md border p-6"
    >
      {startField && endField && (
        <EntryTimer
          startFieldKey={startField.key}
          endFieldKey={endField.key}
          dateFieldKey={dateField?.key}
        />
      )}
      {fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor={field.key}>
            {field.label}
            {field.required && " *"}
          </label>
          {renderInput(
            field,
            post?.values[field.key],
            relationOptions?.[field.key],
          )}
        </div>
      ))}
      {state.status === "error" && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
      <button
        type="submit"
        className="self-start rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
      >
        {post ? "Save changes" : "Create"}
      </button>
    </form>
  );
}

function renderInput(
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

function formatLocalDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

// Fills in the start/end time (and date) inputs with the actual clock times
// observed, so you don't have to type them by hand. Those inputs are
// uncontrolled (defaultValue only), so writing .value directly here doesn't
// fight React — the values still submit normally with the rest of the form.
function EntryTimer({
  startFieldKey,
  endFieldKey,
  dateFieldKey,
}: {
  startFieldKey: string;
  endFieldKey: string;
  dateFieldKey?: string;
}) {
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleStart() {
    const now = new Date();
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setRunning(true);

    intervalRef.current = setInterval(() => {
      setElapsedSeconds(
        Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000),
      );
    }, 1000);

    const startInput = document.getElementById(
      startFieldKey,
    ) as HTMLInputElement | null;
    if (startInput) startInput.value = formatClockValue(now);

    if (dateFieldKey) {
      const dateInput = document.getElementById(
        dateFieldKey,
      ) as HTMLInputElement | null;
      if (dateInput) dateInput.value = formatLocalDateValue(now);
    }
  }

  function handleStop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);

    const endInput = document.getElementById(
      endFieldKey,
    ) as HTMLInputElement | null;
    if (endInput) endInput.value = formatClockValue(new Date());
  }

  return (
    <div className="flex items-center gap-3 rounded-md border px-4 py-3">
      <button
        type="button"
        onClick={running ? handleStop : handleStart}
        className={`rounded-md px-4 py-2 text-sm text-white ${
          running ? "bg-red-600 hover:bg-red-700" : "bg-black hover:bg-gray-800"
        }`}
      >
        {running ? "Stop" : "Start"}
      </button>
      {running && (
        <span className="font-mono text-sm text-gray-600">
          {formatElapsed(elapsedSeconds)}
        </span>
      )}
    </div>
  );
}
