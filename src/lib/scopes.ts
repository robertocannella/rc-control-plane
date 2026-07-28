/**
 * Known permission scopes. Add a string here to make it assignable from
 * the admin users page (/admin/users) — nothing else needs to change to
 * expose it as a checkbox. You still need to add the actual gating logic
 * (checking `session.user.scopes.includes("your-scope")`) wherever that
 * scope should restrict access.
 *
 * "admin" is special: it's what gates access to /admin/users itself.
 */
export const SCOPES = ["admin"] as const;

export type Scope = (typeof SCOPES)[number];
