/**
 * Known fixed permission scopes. Add a string here to make it assignable
 * from the admin users page (/admin/users) — nothing else needs to change
 * to expose it as a checkbox. You still need to add the actual gating
 * logic (checking `session.user.scopes.includes("your-scope")`) wherever
 * that scope should restrict access.
 *
 * "admin" is special: it's what gates access to /admin/users itself.
 */
export const SCOPES = ["admin"] as const;

export type FixedScope = (typeof SCOPES)[number];

/**
 * Per-post-type content edit scope, e.g. "recipes:edit". Structural shape
 * only — not checked against a live list of post types. If a post type is
 * later deleted, a previously-granted "<slug>:edit" string just becomes
 * harmless dead data, since nothing checks it anymore.
 */
export type PostTypeScope = `${string}:edit`;

export type Scope = FixedScope | PostTypeScope;

const POST_TYPE_SCOPE_RE = /^[a-z0-9-]+:edit$/;

export function isPostTypeScope(scope: string): scope is PostTypeScope {
  return POST_TYPE_SCOPE_RE.test(scope);
}

export function editScopeFor(slug: string): PostTypeScope {
  return `${slug}:edit`;
}
