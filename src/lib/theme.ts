export const THEME_COOKIE_NAME = "theme";

export const THEME_NAMES = [
  "light",
  "dark",
  "nord:light",
  "nord:dark",
  "dracula:light",
  "dracula:dark",
] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

export function isThemeName(value: unknown): value is ThemeName {
  return (
    typeof value === "string" &&
    (THEME_NAMES as readonly string[]).includes(value)
  );
}
