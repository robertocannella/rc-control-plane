import type { Session } from "next-auth";
import { editScopeFor } from "@/lib/scopes";
import type { PostType } from "@/lib/post-types";

export function canEditPostType(
  postType: PostType,
  session: Session | null,
): boolean {
  if (!session?.user) return false;
  return (
    session.user.scopes.includes("admin") ||
    session.user.scopes.includes(editScopeFor(postType.slug))
  );
}

export function canViewPostType(
  postType: PostType,
  session: Session | null,
): boolean {
  switch (postType.visibility) {
    case "guest":
      return true;
    case "editor":
      return canEditPostType(postType, session);
    case "account":
    default:
      return !!session?.user;
  }
}
