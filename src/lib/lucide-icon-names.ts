import dynamicIconImports from "lucide-react/dynamicIconImports";

// Split out from post-type-icons.ts as a dependency-free leaf module:
// post-types.ts needs this for icon validation, and post-type-icons.ts
// needs post-types.ts (to look up the "icons" content type) — importing
// straight from post-type-icons.ts here would be circular.
export const DEFAULT_ICON_NAME = "file-text";

export function isValidLucideIconName(name: unknown): name is string {
  return typeof name === "string" && name in dynamicIconImports;
}
