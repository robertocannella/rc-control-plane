import { firestore } from "@/lib/firestore";
import { getPostType, type FieldDef, type PostType } from "@/lib/post-types";
import { coerceFieldValue, isEmptyFieldValue } from "@/lib/field-types";
import { computeDurationMinutes } from "@/lib/duration";

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

function timeToMinutes(value: string): number | null {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function formatClockDisplay(value: string): string {
  const parsed = timeToMinutes(value);
  if (parsed === null) return value;
  const hours = Math.floor(parsed / 60);
  const minutes = parsed % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

// Same "first two time fields + a date field" convention as the chart,
// the timer widget, and the list page's optional columns — not tied to
// specific field keys/labels, so any time-tracker-shaped post type gets
// this for free.
//
// A same-day, real-world calendar can only have one thing happening at a
// time, so two entries whose [start, start+duration) intervals intersect
// on the same date value are rejected — checked in raw minute-of-day
// terms (duration already normalizes a crossed-midnight entry to up to
// 24h), which is a deliberate simplification consistent with the rest of
// this app: a "date" field names a single calendar day, not a real
// start/end timestamp pair.
async function findOverlappingPost(
  slug: string,
  postType: PostType,
  values: Record<string, unknown>,
  excludePostId: string | undefined,
): Promise<Post | null> {
  const timeFields = postType.fields.filter((field) => field.type === "time");
  const [startField, endField] = timeFields;
  const dateField = postType.fields.find((field) => field.type === "date");
  if (!startField || !endField || !dateField) return null;

  const dateValue = values[dateField.key];
  const startValue = values[startField.key];
  const endValue = values[endField.key];
  if (typeof dateValue !== "string" || !dateValue) return null;
  if (typeof startValue !== "string" || typeof endValue !== "string") return null;

  const duration = computeDurationMinutes(startValue, endValue);
  const start = timeToMinutes(startValue);
  if (duration <= 0 || start === null) return null;
  const end = start + duration;

  const posts = await listPosts(slug);
  for (const post of posts) {
    if (post.id === excludePostId) continue;
    if (post.values[dateField.key] !== dateValue) continue;

    const otherStartValue = post.values[startField.key];
    const otherEndValue = post.values[endField.key];
    if (typeof otherStartValue !== "string" || typeof otherEndValue !== "string") {
      continue;
    }
    const otherDuration = computeDurationMinutes(otherStartValue, otherEndValue);
    const otherStart = timeToMinutes(otherStartValue);
    if (otherDuration <= 0 || otherStart === null) continue;
    const otherEnd = otherStart + otherDuration;

    if (start < otherEnd && otherStart < end) {
      return post;
    }
  }
  return null;
}

function overlapMessage(startField: FieldDef, endField: FieldDef, conflict: Post): string {
  const start = conflict.values[startField.key];
  const end = conflict.values[endField.key];
  const range =
    typeof start === "string" && typeof end === "string"
      ? ` (${formatClockDisplay(start)}–${formatClockDisplay(end)})`
      : "";
  return `This overlaps with another entry${range}. Adjust the time or the other entry first.`;
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

  const [startField, endField] = postType.fields.filter((f) => f.type === "time");
  const conflict = await findOverlappingPost(slug, postType, values, undefined);
  if (conflict && startField && endField) {
    return { ok: false, reason: overlapMessage(startField, endField, conflict) };
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

  const [startField, endField] = postType.fields.filter((f) => f.type === "time");
  const conflict = await findOverlappingPost(slug, postType, values, id);
  if (conflict && startField && endField) {
    return { ok: false, reason: overlapMessage(startField, endField, conflict) };
  }

  await postsCollection(slug)
    .doc(id)
    .update({ values, updatedAt: new Date() });
  return { ok: true };
}

export async function deletePost(slug: string, id: string): Promise<void> {
  await postsCollection(slug).doc(id).delete();
}
