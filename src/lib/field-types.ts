export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "image"
  | "link";

export interface FieldTypeMeta {
  value: FieldType;
  label: string;
  hasOptions: boolean;
}

export const FIELD_TYPES: FieldTypeMeta[] = [
  { value: "text", label: "Text (single line)", hasOptions: false },
  { value: "longtext", label: "Long text", hasOptions: false },
  { value: "number", label: "Number", hasOptions: false },
  { value: "date", label: "Date", hasOptions: false },
  { value: "boolean", label: "Yes / No", hasOptions: false },
  { value: "select", label: "Select (choose one)", hasOptions: true },
  { value: "image", label: "Image (URL)", hasOptions: false },
  { value: "link", label: "Link (URL)", hasOptions: false },
];

export function isFieldType(value: unknown): value is FieldType {
  return FIELD_TYPES.some((fieldType) => fieldType.value === value);
}

/**
 * Coerces a raw submitted form value into the plain JSON-compatible value
 * stored for this field type. Every type coerces to a string, number, or
 * boolean — nothing Firestore-specific (e.g. dates are kept as the native
 * "YYYY-MM-DD" string an <input type="date"> already submits).
 */
export function coerceFieldValue(
  type: FieldType,
  raw: FormDataEntryValue | null,
): unknown {
  switch (type) {
    case "boolean":
      return raw === "on" || raw === "true";
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case "text":
    case "longtext":
    case "date":
    case "image":
    case "link":
    case "select":
      return typeof raw === "string" ? raw.trim() : "";
  }
}

export function isEmptyFieldValue(type: FieldType, value: unknown): boolean {
  if (type === "boolean") return false;
  if (type === "number") return value === null || value === undefined;
  return typeof value !== "string" || value.length === 0;
}
