import Link from "next/link";
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
// empty. Shared by the list page and by relation option-building/resolution.
export function getPostTitle(postType: PostType, post: Post): string {
  const titleField = postType.fields[0];
  if (!titleField) return post.id;
  const formatted = formatFieldValue(
    titleField.type,
    post.values[titleField.key],
  );
  return formatted === "—" ? post.id : formatted;
}

export type ResolvedRelationDisplay =
  | { kind: "visible"; label: string; href: string }
  | { kind: "hidden" } // the current viewer can't view the related post type
  | { kind: "missing" }; // the related post (or its post type) no longer exists

export function PostFieldDisplay({
  field,
  value,
  resolved,
}: {
  field: FieldDef;
  value: unknown;
  resolved?: ResolvedRelationDisplay;
}) {
  switch (field.type) {
    case "longtext":
      return (
        <p className="whitespace-pre-wrap">
          {typeof value === "string" && value ? value : "—"}
        </p>
      );
    case "richtext":
      return typeof value === "string" && value ? (
        <div
          className="richtext-content"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <p className="text-gray-500">—</p>
      );
    case "boolean":
      return <p>{value ? "Yes" : "No"}</p>;
    case "image":
      return typeof value === "string" && value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt={field.label}
          className="max-w-full rounded-md"
        />
      ) : (
        <p className="text-gray-500">—</p>
      );
    case "link":
      return typeof value === "string" && value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {value}
        </a>
      ) : (
        <p className="text-gray-500">—</p>
      );
    case "relation":
      if (typeof value !== "string" || !value) {
        return <p className="text-gray-500">—</p>;
      }
      if (!resolved || resolved.kind === "missing") {
        return <p className="text-gray-500">(missing)</p>;
      }
      if (resolved.kind === "hidden") {
        return <p className="text-gray-500">(private)</p>;
      }
      return (
        <Link href={resolved.href} className="underline">
          {resolved.label}
        </Link>
      );
    default:
      return <p>{formatFieldValue(field.type, value)}</p>;
  }
}
