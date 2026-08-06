import { firestore } from "@/lib/firestore";
import { getPostType, type FieldDef } from "@/lib/post-types";
import { coerceFieldValue, isEmptyFieldValue } from "@/lib/field-types";

export interface Post {
  id: string;
  values: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface PostRecord {
  values?: Record<string, unknown>;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  createdBy: string;
}

function postsCollection(slug: string) {
  return firestore.collection("postTypes").doc(slug).collection("posts");
}

function toPost(id: string, data: PostRecord): Post {
  return {
    id,
    values: data.values ?? {},
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    createdBy: data.createdBy,
  };
}

export async function listPosts(slug: string): Promise<Post[]> {
  const snapshot = await postsCollection(slug)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => toPost(doc.id, doc.data() as PostRecord));
}

export async function getPost(slug: string, id: string): Promise<Post | null> {
  const snapshot = await postsCollection(slug).doc(id).get();
  if (!snapshot.exists) return null;
  return toPost(snapshot.id, snapshot.data() as PostRecord);
}

function buildValuesFromFormData(
  fields: FieldDef[],
  formData: FormData,
): { values: Record<string, unknown>; missingRequired: string[] } {
  const values: Record<string, unknown> = {};
  const missingRequired: string[] = [];

  // A time-tracker-shaped schema's end-time field isn't required while the
  // entry is still legitimately in progress (start recorded, end not yet
  // filled in) — you should be able to save other changes (notes, project)
  // mid-timer without being forced to also stop it right then.
  const timeFields = fields.filter((field) => field.type === "time");
  const [startField, endField] = timeFields;
  const startHasValue =
    !!startField &&
    !isEmptyFieldValue(
      startField.type,
      coerceFieldValue(startField.type, formData.get(startField.key)),
    );

  for (const field of fields) {
    const value = coerceFieldValue(field.type, formData.get(field.key));
    const isEmpty = isEmptyFieldValue(field.type, value);
    const isExemptEndField = endField?.key === field.key && startHasValue;

    if (field.required && isEmpty && !isExemptEndField) {
      missingRequired.push(field.label);
    }
    values[field.key] = value;
  }

  return { values, missingRequired };
}

export async function createPost(
  slug: string,
  formData: FormData,
  userId: string,
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const postType = await getPostType(slug);
  if (!postType) return { ok: false, reason: "Post type not found." };

  const { values, missingRequired } = buildValuesFromFormData(
    postType.fields,
    formData,
  );
  if (missingRequired.length > 0) {
    return {
      ok: false,
      reason: `Missing required field(s): ${missingRequired.join(", ")}`,
    };
  }

  const now = new Date();
  const ref = await postsCollection(slug).add({
    values,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  });
  return { ok: true, id: ref.id };
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

// Creates an intentionally incomplete post when a timer is started: whatever
// the entry form currently has filled in, plus the start time/date set to
// the server's clock (not the client's, so it's not affected by clock skew
// or timezone mistakes) — skips required-field validation entirely, since
// this is explicitly a draft the user will finish later via Stop + Save.
export async function startPost(
  slug: string,
  formData: FormData,
  userId: string,
  startFieldKey: string,
  dateFieldKey?: string,
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const postType = await getPostType(slug);
  if (!postType) return { ok: false, reason: "Post type not found." };

  const { values } = buildValuesFromFormData(postType.fields, formData);
  const now = new Date();
  values[startFieldKey] = formatClockValue(now);
  if (dateFieldKey) {
    values[dateFieldKey] = formatLocalDateValue(now);
  }

  const ref = await postsCollection(slug).add({
    values,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  });
  return { ok: true, id: ref.id };
}

export async function updatePost(
  slug: string,
  id: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const postType = await getPostType(slug);
  if (!postType) return { ok: false, reason: "Post type not found." };

  const { values, missingRequired } = buildValuesFromFormData(
    postType.fields,
    formData,
  );
  if (missingRequired.length > 0) {
    return {
      ok: false,
      reason: `Missing required field(s): ${missingRequired.join(", ")}`,
    };
  }

  await postsCollection(slug)
    .doc(id)
    .update({ values, updatedAt: new Date() });
  return { ok: true };
}

export async function deletePost(slug: string, id: string): Promise<void> {
  await postsCollection(slug).doc(id).delete();
}
