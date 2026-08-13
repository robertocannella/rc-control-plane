"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FieldDef } from "@/lib/post-types";
import { RichTextEditor } from "@/components/rich-text-editor";
import { uploadImageAction, quickCreateRelatedPostAction } from "./actions";
import type { QuickCreateState } from "./actions";
import type { RelationFieldData, RelationOption } from "./relation-options";

const common = "rounded-md border px-3 py-1.5 text-sm";

// `allowQuickAdd` is what caps quick-add nesting at exactly one level: true
// from PostForm's own top-level field loop, false from inside a
// QuickAddModal's field loop, so a relation field rendered *inside* a
// modal always falls through to the plain <select> branch below.
//
// `idPrefix` exists because a QuickAddModal can be mounted at the same time
// as the outer post form, and the two schemas often share a field key (both
// commonly have "title") — without a distinct prefix per rendering context,
// `id={field.key}` would collide into duplicate DOM ids and silently break
// label association (and any code targeting an id directly).
export function renderInput(
  slug: string,
  field: FieldDef,
  value: unknown,
  relationData: RelationFieldData | undefined,
  allowQuickAdd: boolean,
  idPrefix = "",
) {
  const id = `${idPrefix}${field.key}`;

  switch (field.type) {
    case "longtext":
      return (
        <textarea
          id={id}
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
          id={id}
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
          id={id}
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
          id={id}
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
          id={id}
          name={field.key}
          type="checkbox"
          defaultChecked={value === true}
          className="h-4 w-4"
        />
      );
    case "select":
      return (
        <select
          id={id}
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
      if (allowQuickAdd && relationData?.quickAdd) {
        return (
          <RelationFieldInput
            id={id}
            field={field}
            value={value}
            options={relationData.options}
            quickAdd={relationData.quickAdd}
          />
        );
      }
      return (
        <select
          id={id}
          name={field.key}
          defaultValue={typeof value === "string" ? value : ""}
          required={field.required}
          className={common}
        >
          <option value="" disabled>
            Choose...
          </option>
          {(relationData?.options ?? []).map((option) => (
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
          id={id}
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
          id={id}
          name={field.key}
          type="text"
          defaultValue={typeof value === "string" ? value : ""}
          required={field.required}
          className={common}
        />
      );
  }
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

// Replaces the plain <select> for a relation field when quick-add is
// available. The select is controlled (value/onChange) rather than
// uncontrolled like every other field in the form — a deliberate one-off
// exception, needed so a newly-created option can be appended and selected
// programmatically after the modal closes.
function RelationFieldInput({
  id,
  field,
  value,
  options,
  quickAdd,
}: {
  id: string;
  field: FieldDef;
  value: unknown;
  options: RelationOption[];
  quickAdd: NonNullable<RelationFieldData["quickAdd"]>;
}) {
  const [currentOptions, setCurrentOptions] = useState(options);
  const [selected, setSelected] = useState(
    typeof value === "string" ? value : "",
  );
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <select
        id={id}
        name={field.key}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        required={field.required}
        className={`${common} flex-1`}
      >
        <option value="" disabled>
          Choose...
        </option>
        {currentOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="text-sm whitespace-nowrap text-accent hover:underline"
      >
        + Add new
      </button>
      {modalOpen && (
        <QuickAddModal
          relatedSlug={field.relatedPostType!}
          relatedPostType={quickAdd.relatedPostType}
          nestedRelationOptions={quickAdd.nestedRelationOptions}
          onClose={() => setModalOpen(false)}
          onCreated={(id, label) => {
            setCurrentOptions((prev) => [...prev, { id, label }]);
            setSelected(id);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

const initialQuickCreateState: QuickCreateState = { status: "idle" };

function QuickAddModal({
  relatedSlug,
  relatedPostType,
  nestedRelationOptions,
  onClose,
  onCreated,
}: {
  relatedSlug: string;
  relatedPostType: NonNullable<RelationFieldData["quickAdd"]>["relatedPostType"];
  nestedRelationOptions: Record<string, RelationOption[]>;
  onClose: () => void;
  onCreated: (id: string, label: string) => void;
}) {
  const action = quickCreateRelatedPostAction.bind(null, relatedSlug);
  const [state, formAction] = useActionState(action, initialQuickCreateState);

  useEffect(() => {
    if (state.status === "success" && state.id && state.label) {
      onCreated(state.id, state.label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Portaled to <body> rather than rendered in place — this component is
  // reached from inside the post form's own <form>, and a <form> can't
  // legally contain a nested <form> (invalid HTML, React hydration error).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 bg-black/30"
      />
      <div className="relative z-10 flex w-full max-w-md flex-col gap-4 rounded-md border border-border bg-surface p-6 shadow-lg">
        <h2 className="text-lg font-semibold">New {relatedPostType.label}</h2>
        <form action={formAction} className="flex flex-col gap-4">
          {relatedPostType.fields.map((nestedField) => (
            <div key={nestedField.key} className="flex flex-col gap-1">
              <label
                className="text-sm font-medium"
                htmlFor={`quickadd-${nestedField.key}`}
              >
                {nestedField.label}
                {nestedField.required && " *"}
              </label>
              {renderInput(
                relatedSlug,
                nestedField,
                undefined,
                nestedField.type === "relation"
                  ? { options: nestedRelationOptions[nestedField.key] ?? [] }
                  : undefined,
                false,
                "quickadd-",
              )}
            </div>
          ))}
          {state.status === "error" && (
            <p className="text-sm text-red-600">{state.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground hover:opacity-90"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
