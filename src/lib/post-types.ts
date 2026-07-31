import { firestore } from "@/lib/firestore";
import { isFieldType, type FieldType } from "@/lib/field-types";
import {
  isPostTypeIconName,
  DEFAULT_POST_TYPE_ICON,
  type PostTypeIconName,
} from "@/lib/post-type-icons";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  relatedPostType?: string; // slug of the post type this "relation" field points to
}

/**
 * Who can view content of this post type:
 * - "guest": anyone, including signed-out visitors
 * - "account": any signed-in user
 * - "editor": only users who can edit this post type (admin or its edit scope)
 */
export type PostTypeVisibility = "guest" | "account" | "editor";

export interface PostType {
  slug: string;
  label: string;
  visibility: PostTypeVisibility;
  icon: PostTypeIconName;
  fields: FieldDef[];
  createdAt: Date;
  updatedAt: Date;
}

interface PostTypeRecord {
  label: string;
  visibility?: unknown;
  icon?: unknown;
  fields?: unknown;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

const SLUG_RE = /^[a-z0-9-]+$/;
const FIELD_KEY_RE = /^[a-z][a-z0-9_]*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function isValidFieldKey(key: string): boolean {
  return FIELD_KEY_RE.test(key);
}

function sanitizeFieldDef(raw: unknown): FieldDef | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.key !== "string" || !isValidFieldKey(r.key)) return null;
  if (typeof r.label !== "string" || r.label.trim().length === 0) return null;
  if (!isFieldType(r.type)) return null;

  const field: FieldDef = {
    key: r.key,
    label: r.label,
    type: r.type,
    required: r.required === true,
  };

  if (r.type === "select") {
    field.options = Array.isArray(r.options)
      ? r.options.filter(
          (o): o is string => typeof o === "string" && o.trim().length > 0,
        )
      : [];
  }

  if (r.type === "relation") {
    // A relation with no valid target is meaningless, unlike a select with
    // zero options — reject the field entirely rather than saving it broken.
    if (typeof r.relatedPostType !== "string" || !isValidSlug(r.relatedPostType)) {
      return null;
    }
    field.relatedPostType = r.relatedPostType;
  }

  return field;
}

export function sanitizeFields(raw: unknown): FieldDef[] {
  if (!Array.isArray(raw)) return [];
  const seenKeys = new Set<string>();
  const fields: FieldDef[] = [];
  for (const item of raw) {
    const field = sanitizeFieldDef(item);
    if (!field || seenKeys.has(field.key)) continue;
    seenKeys.add(field.key);
    fields.push(field);
  }
  return fields;
}

function sanitizeVisibility(v: unknown): PostTypeVisibility {
  if (v === "guest" || v === "account" || v === "editor") return v;
  // Legacy values from before the three-tier visibility model.
  if (v === "public") return "guest";
  if (v === "private") return "account";
  return "editor"; // fail closed for anything unrecognized
}

function sanitizeIcon(icon: unknown): PostTypeIconName {
  return isPostTypeIconName(icon) ? icon : DEFAULT_POST_TYPE_ICON;
}

function toPostType(slug: string, data: PostTypeRecord): PostType {
  return {
    slug,
    label: data.label,
    visibility: sanitizeVisibility(data.visibility),
    icon: sanitizeIcon(data.icon),
    fields: sanitizeFields(data.fields),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

export async function listPostTypes(): Promise<PostType[]> {
  const snapshot = await firestore
    .collection("postTypes")
    .orderBy("label")
    .get();
  return snapshot.docs.map((doc) =>
    toPostType(doc.id, doc.data() as PostTypeRecord),
  );
}

export async function getPostType(slug: string): Promise<PostType | null> {
  const snapshot = await firestore.collection("postTypes").doc(slug).get();
  if (!snapshot.exists) return null;
  return toPostType(snapshot.id, snapshot.data() as PostTypeRecord);
}

export async function createPostType(params: {
  slug: string;
  label: string;
  visibility: PostTypeVisibility;
  icon: PostTypeIconName;
  fields: FieldDef[];
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isValidSlug(params.slug)) {
    return {
      ok: false,
      reason: "Slug must be lowercase letters, numbers, and hyphens only.",
    };
  }

  const now = new Date();
  try {
    await firestore
      .collection("postTypes")
      .doc(params.slug)
      .create({
        label: params.label,
        visibility: params.visibility,
        icon: params.icon,
        fields: params.fields,
        createdAt: now,
        updatedAt: now,
      });
    return { ok: true };
  } catch {
    return { ok: false, reason: "A post type with that slug already exists." };
  }
}

export async function updatePostType(
  slug: string,
  params: {
    label: string;
    visibility: PostTypeVisibility;
    icon: PostTypeIconName;
    fields: FieldDef[];
  },
): Promise<void> {
  await firestore.collection("postTypes").doc(slug).update({
    label: params.label,
    visibility: params.visibility,
    icon: params.icon,
    fields: params.fields,
    updatedAt: new Date(),
  });
}

export async function deletePostType(
  slug: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const postsSnapshot = await firestore
    .collection("postTypes")
    .doc(slug)
    .collection("posts")
    .limit(1)
    .get();

  if (!postsSnapshot.empty) {
    return {
      ok: false,
      reason: "Delete all posts of this type before deleting the post type.",
    };
  }

  await firestore.collection("postTypes").doc(slug).delete();
  return { ok: true };
}
