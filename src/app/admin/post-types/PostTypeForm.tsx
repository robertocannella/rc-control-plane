"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FIELD_TYPES, type FieldType } from "@/lib/field-types";
import type { PostType, PostTypeVisibility } from "@/lib/post-types";
import {
  POST_TYPE_ICONS,
  POST_TYPE_ICON_NAMES,
  DEFAULT_POST_TYPE_ICON,
  type PostTypeIconName,
} from "@/lib/post-type-icons";
import { useToast } from "@/components/toast-provider";
import {
  createPostTypeAction,
  updatePostTypeAction,
  type PostTypeFormState,
} from "./actions";

const initialState: PostTypeFormState = { status: "idle" };

let nextFieldRowId = 0;

interface FieldRow {
  rowId: number;
  isNew: boolean; // key/type are only editable while true (i.e. not yet saved)
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  optionsText: string; // comma-separated, only meaningful when type === "select"
  relatedPostType: string; // slug, only meaningful when type === "relation"
  aiSuggest: boolean; // only meaningful when type === "relation"
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function keyify(label: string, fallback: string): string {
  const key = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key && /^[a-z]/.test(key) ? key : fallback;
}

type PostTypeFormProps = (
  | { mode: "create" }
  | { mode: "edit"; postType: PostType }
) & {
  postTypes: { slug: string; label: string }[];
};

export function PostTypeForm(props: PostTypeFormProps) {
  const postType = props.mode === "edit" ? props.postType : undefined;
  const action =
    props.mode === "create"
      ? createPostTypeAction
      : updatePostTypeAction.bind(null, props.postType.slug);
  const [state, formAction] = useActionState(action, initialState);
  const showToast = useToast();
  const router = useRouter();

  const [label, setLabel] = useState(postType?.label ?? "");
  const [slug, setSlug] = useState(postType?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(props.mode === "edit");
  const [visibility, setVisibility] = useState<PostTypeVisibility>(
    postType?.visibility ?? "account",
  );
  const [icon, setIcon] = useState<PostTypeIconName>(
    postType?.icon ?? DEFAULT_POST_TYPE_ICON,
  );
  const [fields, setFields] = useState<FieldRow[]>(() =>
    (postType?.fields ?? []).map((field) => ({
      ...field,
      rowId: nextFieldRowId++,
      isNew: false,
      optionsText: (field.options ?? []).join(", "),
      relatedPostType: field.relatedPostType ?? "",
      aiSuggest: field.aiSuggest ?? false,
    })),
  );

  useEffect(() => {
    if (state.status === "success") {
      showToast(
        props.mode === "create" ? "Post type created" : "Post type updated",
      );
      if (props.mode === "create") router.push("/admin/post-types");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function addField() {
    setFields((current) => [
      ...current,
      {
        rowId: nextFieldRowId++,
        isNew: true,
        key: "",
        label: "",
        type: "text",
        required: false,
        optionsText: "",
        relatedPostType: props.postTypes[0]?.slug ?? "",
        aiSuggest: false,
      },
    ]);
  }

  function removeField(rowId: number) {
    setFields((current) => current.filter((field) => field.rowId !== rowId));
  }

  function moveField(rowId: number, direction: -1 | 1) {
    setFields((current) => {
      const index = current.findIndex((field) => field.rowId === rowId);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  function updateField(rowId: number, patch: Partial<FieldRow>) {
    setFields((current) =>
      current.map((field) =>
        field.rowId === rowId ? { ...field, ...patch } : field,
      ),
    );
  }

  const fieldsPayload = fields.map((field) => ({
    key: field.isNew ? keyify(field.label, `field_${field.rowId}`) : field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    ...(field.type === "select"
      ? {
          options: field.optionsText
            .split(",")
            .map((option) => option.trim())
            .filter(Boolean),
        }
      : {}),
    ...(field.type === "relation"
      ? { relatedPostType: field.relatedPostType, aiSuggest: field.aiSuggest }
      : {}),
  }));

  return (
    <form action={formAction} className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="label">
          Label
        </label>
        <input
          id="label"
          name="label"
          type="text"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            if (props.mode === "create" && !slugTouched) {
              setSlug(slugify(e.target.value));
            }
          }}
          required
          className="rounded-md border px-3 py-1.5 text-sm"
        />
      </div>

      {props.mode === "create" ? (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="slug">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            required
            className="rounded-md border px-3 py-1.5 text-sm font-mono"
          />
          <p className="text-xs text-gray-500">
            Used in URLs and permission scopes. Can&apos;t be changed later.
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Slug: <span className="font-mono">{postType!.slug}</span>
        </p>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Icon</span>
        <div className="flex flex-wrap gap-2">
          {POST_TYPE_ICON_NAMES.map((name) => {
            const { label: iconLabel, Icon } = POST_TYPE_ICONS[name];
            const selected = icon === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setIcon(name)}
                aria-pressed={selected}
                title={iconLabel}
                className={`flex h-10 w-10 items-center justify-center rounded-md border hover:bg-foreground/5 ${
                  selected ? "border-accent" : "border-border"
                }`}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
        <input type="hidden" name="icon" value={icon} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Visibility</span>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="visibility"
              value="guest"
              checked={visibility === "guest"}
              onChange={() => setVisibility("guest")}
            />
            Guest (anyone, no sign-in required)
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="visibility"
              value="account"
              checked={visibility === "account"}
              onChange={() => setVisibility("account")}
            />
            Account (any signed-in user)
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="visibility"
              value="editor"
              checked={visibility === "editor"}
              onChange={() => setVisibility("editor")}
            />
            Editor only
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">Fields</span>
        <p className="text-xs text-gray-500">
          Tip: the first two &ldquo;Time of day&rdquo; fields (in the order
          below) get a built-in start/stop timer on the entry form — label
          them whatever you like.
        </p>
        {fields.length === 0 && (
          <p className="text-sm text-gray-500">
            No fields yet — add at least one.
          </p>
        )}
        {fields.map((field, index) => (
          <div
            key={field.rowId}
            className="flex flex-wrap items-start gap-3 rounded-md border px-4 py-3"
          >
            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <input
                type="text"
                placeholder="Field label"
                value={field.label}
                onChange={(e) =>
                  updateField(field.rowId, { label: e.target.value })
                }
                className="rounded-md border px-3 py-1.5 text-sm"
              />
              {!field.isNew && (
                <span className="text-xs text-gray-500">
                  key: <span className="font-mono">{field.key}</span>
                </span>
              )}
            </div>

            {field.isNew ? (
              <select
                value={field.type}
                onChange={(e) =>
                  updateField(field.rowId, {
                    type: e.target.value as FieldType,
                  })
                }
                className="rounded-md border px-2 py-1.5 text-sm"
              >
                {FIELD_TYPES.map((fieldType) => (
                  <option key={fieldType.value} value={fieldType.value}>
                    {fieldType.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded-md bg-foreground/5 px-2 py-1.5 text-sm">
                {FIELD_TYPES.find((ft) => ft.value === field.type)?.label ??
                  field.type}
              </span>
            )}

            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) =>
                  updateField(field.rowId, { required: e.target.checked })
                }
              />
              Required
            </label>

            {field.type === "select" && (
              <input
                type="text"
                placeholder="Options, comma separated"
                value={field.optionsText}
                onChange={(e) =>
                  updateField(field.rowId, { optionsText: e.target.value })
                }
                className="min-w-48 flex-1 rounded-md border px-3 py-1.5 text-sm"
              />
            )}

            {field.type === "relation" &&
              (props.postTypes.length > 0 ? (
                <div className="flex min-w-48 flex-1 flex-col gap-1">
                  <select
                    value={field.relatedPostType}
                    onChange={(e) =>
                      updateField(field.rowId, {
                        relatedPostType: e.target.value,
                      })
                    }
                    className="rounded-md border px-2 py-1.5 text-sm"
                  >
                    {props.postTypes.map((pt) => (
                      <option key={pt.slug} value={pt.slug}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                  {!field.isNew && (
                    <span className="text-xs text-gray-500">
                      Changing this may make existing entries show as
                      missing.
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-gray-500">
                  Create another post type first.
                </span>
              ))}

            {field.type === "relation" && (
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={field.aiSuggest}
                  onChange={(e) =>
                    updateField(field.rowId, { aiSuggest: e.target.checked })
                  }
                />
                AI suggest
              </label>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveField(field.rowId, -1)}
                disabled={index === 0}
                className="rounded-md border px-2 py-1 text-sm disabled:opacity-30"
                aria-label="Move field up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveField(field.rowId, 1)}
                disabled={index === fields.length - 1}
                className="rounded-md border px-2 py-1 text-sm disabled:opacity-30"
                aria-label="Move field down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeField(field.rowId)}
                className="rounded-md border px-2 py-1 text-sm text-red-600"
                aria-label="Remove field"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addField}
          className="self-start rounded-md border border-border px-3 py-1.5 text-sm hover:bg-foreground/5"
        >
          Add field
        </button>
      </div>

      <input type="hidden" name="fields" value={JSON.stringify(fieldsPayload)} />

      {state.status === "error" && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <button
        type="submit"
        className="self-start rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground hover:opacity-90"
      >
        {props.mode === "create" ? "Create post type" : "Save changes"}
      </button>
    </form>
  );
}
