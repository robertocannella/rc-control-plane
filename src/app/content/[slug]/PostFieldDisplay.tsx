import type { FieldDef } from "@/lib/post-types";

export function formatFieldValue(type: FieldDef["type"], value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "boolean") return value ? "Yes" : "No";
  if (type === "richtext" && typeof value === "string") {
    const stripped = value.replace(/<[^>]*>/g, "").trim();
    return stripped || "—";
  }
  return String(value);
}

export function PostFieldDisplay({
  field,
  value,
}: {
  field: FieldDef;
  value: unknown;
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
    default:
      return <p>{formatFieldValue(field.type, value)}</p>;
  }
}
