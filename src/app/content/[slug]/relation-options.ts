import { getPostType, type FieldDef } from "@/lib/post-types";
import { listPosts } from "@/lib/posts";
import { getPostTitle } from "./PostFieldDisplay";

// For each "relation" field in the schema, fetches the related post type's
// entries so the entry form can render a <select> of their titles.
export async function buildRelationOptions(
  fields: FieldDef[],
): Promise<Record<string, { id: string; label: string }[]>> {
  const relationOptions: Record<string, { id: string; label: string }[]> = {};

  for (const field of fields) {
    if (field.type !== "relation" || !field.relatedPostType) continue;
    const relatedPostType = await getPostType(field.relatedPostType);
    if (!relatedPostType) continue;
    const relatedPosts = await listPosts(field.relatedPostType);
    relationOptions[field.key] = relatedPosts.map((post) => ({
      id: post.id,
      label: getPostTitle(relatedPostType, post),
    }));
  }

  return relationOptions;
}
