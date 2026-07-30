"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef } from "@/lib/post-types";
import type { Post } from "@/lib/posts";
import { useToast } from "@/components/toast-provider";
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
}: {
  slug: string;
  fields: FieldDef[];
  post?: Post;
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

  return (
    <form
      action={formAction}
      className="flex w-full max-w-2xl flex-col gap-4"
    >
      {fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor={field.key}>
            {field.label}
            {field.required && " *"}
          </label>
          {renderInput(field, post?.values[field.key])}
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

function renderInput(field: FieldDef, value: unknown) {
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
