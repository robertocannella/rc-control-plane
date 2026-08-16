import type { ReactNode } from "react";
import { listIconOptions, resolveLucideIcon } from "@/lib/post-type-icons";
import { DEFAULT_ICON_NAME } from "@/lib/lucide-icon-names";

export interface IconPickerOption {
  name: string;
  label: string;
  icon: ReactNode;
}

const PICKER_ICON_CLASS = "h-5 w-5";

// The picker's option list, server-resolved into pre-rendered elements
// (same reason as NavItem.icon in layout.tsx — a component reference
// isn't serializable across the server/client boundary into
// PostTypeForm, a Client Component). Always guarantees `currentIconName`
// (the post type being edited, if any) and the schema default are both
// present, even if an admin has since removed that option from the
// Icons content type — the picker should never fail to show/select
// what's actually assigned.
export async function buildIconPickerOptions(
  currentIconName?: string,
): Promise<IconPickerOption[]> {
  // De-duped by name (first occurrence wins) — two Icon posts
  // accidentally sharing a name would otherwise produce duplicate React
  // keys in the picker grid.
  const seenListed = new Set<string>();
  const listed = (await listIconOptions()).filter((option) => {
    if (seenListed.has(option.name)) return false;
    seenListed.add(option.name);
    return true;
  });
  const names = new Set(listed.map((option) => option.name));

  const extraNames: string[] = [];
  for (const name of [currentIconName, DEFAULT_ICON_NAME]) {
    if (name && !names.has(name)) {
      names.add(name);
      extraNames.push(name);
    }
  }

  const merged = [
    ...listed.map((option) => ({ name: option.name, label: option.label })),
    ...extraNames.map((name) => ({ name, label: name })),
  ];

  return Promise.all(
    merged.map(async ({ name, label }) => {
      const Icon = await resolveLucideIcon(name);
      return { name, label, icon: <Icon className={PICKER_ICON_CLASS} /> };
    }),
  );
}
