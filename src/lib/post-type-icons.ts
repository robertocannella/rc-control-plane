import type { LucideIcon } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { getPostType } from "@/lib/post-types";
import { listPosts } from "@/lib/posts";
import { isValidLucideIconName } from "@/lib/lucide-icon-names";

// Each name is its own dynamic import() target inside dynamicIconImports
// (Lucide ships it as a literal object of `name: () => import(...)`
// entries specifically so bundlers can code-split each icon
// individually) — resolving one here only ever pulls in the icons
// actually used, not the full ~1500-icon library. Safe to call from
// Server Components (already async) at render time, same as any other
// await — no client-side lazy-load flicker.
export async function resolveLucideIcon(name: unknown): Promise<LucideIcon> {
  const key = isValidLucideIconName(name) ? name : "file-text";
  const load = dynamicIconImports[key as keyof typeof dynamicIconImports];
  const mod = await load();
  return mod.default;
}

export interface IconOption {
  id: string;
  label: string;
  name: string;
}

const ICONS_SLUG = "icons";

// The admin-managed set of icons offered by the post-type icon picker —
// backed by real posts under the "icons" content type (fields: label,
// name) rather than a fixed list, so adding an option is a normal
// content edit. A post type's *stored* icon is just the Lucide name
// string, not a reference to one of these posts, so removing an option
// here later never breaks an already-assigned icon (see
// resolveLucideIcon, which only cares whether the name is valid).
export async function listIconOptions(): Promise<IconOption[]> {
  const iconsType = await getPostType(ICONS_SLUG);
  if (!iconsType) return [];

  const posts = await listPosts(ICONS_SLUG);
  return posts
    .map((post): IconOption => ({
      id: post.id,
      label: typeof post.values.label === "string" && post.values.label
        ? post.values.label
        : post.id,
      name: typeof post.values.name === "string" ? post.values.name : "",
    }))
    .filter((option) => isValidLucideIconName(option.name));
}
