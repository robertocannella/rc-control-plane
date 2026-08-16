import type { FieldDef, PostType } from "@/lib/post-types";
import type { Post } from "@/lib/posts";

function formatTimeOfDay(value: string): string {
  const [hoursStr, minutesStr] = value.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatFieldValue(type: FieldDef["type"], value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "boolean") return value ? "Yes" : "No";
  if (type === "richtext" && typeof value === "string") {
    const stripped = value.replace(/<[^>]*>/g, "").trim();
    return stripped || "—";
  }
  if (type === "time" && typeof value === "string") {
    return formatTimeOfDay(value);
  }
  return String(value);
}

// Resolves a post's display title using the "first field in schema" convention
// already used for list-row titles. Falls back to the raw id if that field is
// empty. Shared by the list page, relation option-building/resolution, and
// the related-posts backlinks lookup.
export function getPostTitle(postType: PostType, post: Post): string {
  const titleField = postType.fields[0];
  if (!titleField) return post.id;
  const formatted = formatFieldValue(
    titleField.type,
    post.values[titleField.key],
  );
  return formatted === "—" ? post.id : formatted;
}
