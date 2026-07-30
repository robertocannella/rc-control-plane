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

  for (const field of fields) {
    const value = coerceFieldValue(field.type, formData.get(field.key));
    if (field.required && isEmptyFieldValue(field.type, value)) {
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
