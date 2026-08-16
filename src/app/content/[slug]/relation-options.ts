import { getPostType, type FieldDef, type PostType } from "@/lib/post-types";
import { listPosts } from "@/lib/posts";
import { getPostTitle } from "@/lib/post-title";

export interface RelationOption {
  id: string;
  label: string;
}

export interface RelationFieldData {
  options: RelationOption[];
  // Present only for top-level fields — the nested, one-level-deep fetch
  // below never sets this, which is what caps quick-add recursion at one
  // level (a nested relation field has nothing to recurse into).
  quickAdd?: {
    relatedPostType: PostType;
    nestedRelationOptions: Record<string, RelationOption[]>;
  };
}

async function listRelationOptions(
  field: FieldDef,
  relatedPostType: PostType,
): Promise<RelationOption[]> {
  const relatedPosts = await listPosts(field.relatedPostType!);
  return relatedPosts.map((post) => ({
    id: post.id,
    label: getPostTitle(relatedPostType, post),
  }));
}

// For each "relation" field in the schema, fetches the related post type's
// entries so the entry form can render a <select> of their titles — plus,
// one level deep, the same for the related post type's own relation
// fields, so a quick-add modal for it can render a fully working form.
export async function buildRelationOptions(
  fields: FieldDef[],
): Promise<Record<string, RelationFieldData>> {
  const result: Record<string, RelationFieldData> = {};

  for (const field of fields) {
    if (field.type !== "relation" || !field.relatedPostType) continue;
    const relatedPostType = await getPostType(field.relatedPostType);
    if (!relatedPostType) continue;

    const options = await listRelationOptions(field, relatedPostType);

    const nestedRelationOptions: Record<string, RelationOption[]> = {};
    for (const nestedField of relatedPostType.fields) {
      if (nestedField.type !== "relation" || !nestedField.relatedPostType) {
        continue;
      }
      const nestedRelatedType = await getPostType(nestedField.relatedPostType);
      if (!nestedRelatedType) continue;
      nestedRelationOptions[nestedField.key] = await listRelationOptions(
        nestedField,
        nestedRelatedType,
      );
    }

    result[field.key] = {
      options,
      quickAdd: { relatedPostType, nestedRelationOptions },
    };
  }

  return result;
}
