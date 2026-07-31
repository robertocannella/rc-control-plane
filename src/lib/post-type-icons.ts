import {
  BookOpen,
  Calendar,
  FileText,
  Folder,
  Image,
  MapPin,
  Newspaper,
  ShoppingBag,
  Star,
  Tag,
  UtensilsCrossed,
  Users,
  type LucideIcon,
} from "lucide-react";

export const POST_TYPE_ICONS = {
  "file-text": { label: "Document", Icon: FileText },
  "utensils-crossed": { label: "Recipe", Icon: UtensilsCrossed },
  calendar: { label: "Event", Icon: Calendar },
  "book-open": { label: "Article", Icon: BookOpen },
  image: { label: "Photo", Icon: Image },
  "map-pin": { label: "Place", Icon: MapPin },
  star: { label: "Favorite", Icon: Star },
  tag: { label: "Category", Icon: Tag },
  folder: { label: "Collection", Icon: Folder },
  users: { label: "People", Icon: Users },
  newspaper: { label: "News", Icon: Newspaper },
  "shopping-bag": { label: "Shopping", Icon: ShoppingBag },
} satisfies Record<string, { label: string; Icon: LucideIcon }>;

export type PostTypeIconName = keyof typeof POST_TYPE_ICONS;

export const POST_TYPE_ICON_NAMES = Object.keys(
  POST_TYPE_ICONS,
) as PostTypeIconName[];

export const DEFAULT_POST_TYPE_ICON: PostTypeIconName = "file-text";

export function isPostTypeIconName(value: unknown): value is PostTypeIconName {
  return typeof value === "string" && value in POST_TYPE_ICONS;
}

export function getPostTypeIcon(name: unknown): LucideIcon {
  return isPostTypeIconName(name)
    ? POST_TYPE_ICONS[name].Icon
    : POST_TYPE_ICONS[DEFAULT_POST_TYPE_ICON].Icon;
}
