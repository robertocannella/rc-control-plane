import Link from "next/link";
import type { FieldDef } from "@/lib/post-types";
import { formatFieldValue } from "@/lib/post-title";

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
