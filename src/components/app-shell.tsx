"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Menu as MenuIcon,
  X,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { ThemeName } from "@/lib/theme";

export interface NavLink {
  href: string;
  label: string;
  // A pre-rendered icon element (e.g. <Home className="h-5 w-5 shrink-0" />)
  // rather than a component reference — the latter isn't serializable
  // across the server/client boundary when passed down from layout.tsx.
  icon: ReactNode;
}

// A collapsible group (e.g. "Content", holding every post type) — the
// group itself is also a real link (its own page, e.g. the /content
// hub), with `children` expandable inline rather than navigated to
// separately. Distinguished from a plain NavLink by the presence of
// `children`.
export interface NavGroup extends NavLink {
  children: NavLink[];
}

export type NavItem = NavLink | NavGroup;

function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

interface AppShellUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface AppShellProps {
  children: ReactNode;
  navItems: NavItem[];
  user?: AppShellUser;
  initialTheme: ThemeName | null;
  signOutAction?: () => void;
  signInAction?: () => void;
}

// Bottom bar shows the first few items directly; "Menu" always expands the rest
// plus account actions, so sign-out stays reachable even with few nav items.
const MOBILE_PRIMARY_COUNT = 3;

function UserAvatarFallback({ label }: { label: string }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold">
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

function AccountButton({
  user,
  signOutAction,
  signInAction,
}: {
  user?: AppShellUser;
  signOutAction?: () => void;
  signInAction?: () => void;
}) {
  const AccountIcon = user ? LogOut : LogIn;
  return (
    <form action={user ? signOutAction : signInAction}>
      <button
        type="submit"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-foreground/10"
      >
        {user ? (
          user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-6 w-6 shrink-0 rounded-full" />
          ) : (
            <UserAvatarFallback label={user.name ?? user.email ?? "?"} />
          )
        ) : (
          <AccountIcon className="h-5 w-5 shrink-0" />
        )}
        <span className="hidden sm:inline">
          {user ? (user.name ?? user.email) : "Sign in"}
        </span>
      </button>
    </form>
  );
}

export function AppShell({
  children,
  navItems,
  user,
  initialTheme,
  signOutAction,
  signInAction,
}: AppShellProps) {
  const pathname = usePathname();
  const [tabletExpanded, setTabletExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Expanded groups: a set of hrefs (unique across NavGroups). Starts
  // with any group that contains the current page already expanded, so
  // navigating straight to e.g. /content/tasks (a bookmark, a link from
  // elsewhere) doesn't land on a sidebar that hides where you are.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const item of navItems) {
      if (isNavGroup(item) && item.children.some((child) => isActive(child.href))) {
        initial.add(item.href);
      }
    }
    return initial;
  });

  function toggleGroup(href: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  }

  const primaryMobileItems = navItems.slice(0, MOBILE_PRIMARY_COUNT);
  const mobileGroups = navItems.filter(isNavGroup);
  const AccountIcon = user ? LogOut : LogIn;
  const accountLabel = user ? "Sign out" : "Sign in";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Top bar: full width, above the sidebar+content row — matches the
          reference's two-level layout instead of nav/account living inside
          the sidebar. */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt="Control Plane"
          className="h-8 w-8 rounded-md md:h-10 md:w-10"
        />
        <div className="flex items-center gap-1">
          <ThemeSwitcher initialTheme={initialTheme} />
          <div className="hidden md:block">
            <AccountButton
              user={user}
              signOutAction={signOutAction}
              signInAction={signInAction}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar: hidden on mobile, collapsed-by-default on tablet, always expanded on desktop */}
        <aside
          className={`hidden shrink-0 flex-col border-r border-border bg-surface transition-all duration-200 md:flex ${
            tabletExpanded ? "md:w-64" : "md:w-16 lg:w-64"
          }`}
        >
          <div className="flex h-10 items-center justify-end px-2 pt-2">
            <button
              type="button"
              onClick={() => setTabletExpanded((v) => !v)}
              className="rounded-md p-1.5 hover:bg-foreground/10 lg:hidden"
              aria-label={tabletExpanded ? "Collapse menu" : "Expand menu"}
            >
              {tabletExpanded ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 px-2">
            {navItems.map((item) => {
              const groupActive =
                isActive(item.href) ||
                (isNavGroup(item) && item.children.some((child) => isActive(child.href)));

              if (isNavGroup(item)) {
                const expanded = expandedGroups.has(item.href);
                return (
                  <div key={item.href}>
                    <div
                      className={`relative flex items-center rounded-md ${
                        groupActive ? "bg-accent/10 font-medium text-accent" : ""
                      }`}
                    >
                      <span
                        className={`absolute top-1 bottom-1 left-0 w-0.5 rounded-full ${
                          groupActive ? "bg-accent" : "bg-transparent"
                        }`}
                      />
                      <Link
                        href={item.href}
                        className="flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-foreground/5"
                      >
                        {item.icon}
                        <span className={tabletExpanded ? "inline" : "hidden lg:inline"}>
                          {item.label}
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.href)}
                        className={`shrink-0 rounded-md p-2 hover:bg-foreground/10 ${
                          tabletExpanded ? "flex" : "hidden lg:flex"
                        }`}
                        aria-expanded={expanded}
                        aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                    {expanded && (
                      <div className="ml-4 flex flex-col gap-0.5 border-l border-border pl-2">
                        {item.children.map((child) => {
                          const active = isActive(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-foreground/5 ${
                                active ? "bg-accent/10 font-medium text-accent" : ""
                              }`}
                            >
                              {child.icon}
                              <span className={tabletExpanded ? "inline" : "hidden lg:inline"}>
                                {child.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-foreground/5 ${
                    active ? "bg-accent/10 font-medium text-accent" : ""
                  }`}
                >
                  <span
                    className={`absolute top-1 bottom-1 left-0 w-0.5 rounded-full ${
                      active ? "bg-accent" : "bg-transparent"
                    }`}
                  />
                  {item.icon}
                  <span className={tabletExpanded ? "inline" : "hidden lg:inline"}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content: scrolls with the actual document on mobile (so the
            browser chrome can auto-hide), but scrolls internally at md+ so
            the sidebar stays pinned. */}
        <main className="min-w-0 flex-1 pb-16 md:overflow-auto md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile: backdrop + upward-expanding menu */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
        />
      )}
      <div
        className={`fixed inset-x-0 bottom-16 z-30 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-lg transition-transform duration-200 md:hidden ${
          mobileMenuOpen
            ? "translate-y-0"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="text-sm font-medium">Theme</span>
          <ThemeSwitcher initialTheme={initialTheme} />
        </div>
        <div className="grid grid-cols-3 gap-2 p-4">
          {navItems.map((item) => {
            if (isNavGroup(item)) {
              const groupActive =
                isActive(item.href) || item.children.some((child) => isActive(child.href));
              const expanded = expandedGroups.has(item.href);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => toggleGroup(item.href)}
                  aria-label={item.label}
                  aria-expanded={expanded}
                  className={`flex items-center justify-center gap-1 rounded-md py-3 hover:bg-foreground/5 ${
                    groupActive ? "bg-accent/10 font-medium text-accent" : ""
                  }`}
                >
                  {item.icon}
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-label={item.label}
                className={`flex items-center justify-center rounded-md py-3 hover:bg-foreground/5 ${
                  isActive(item.href) ? "bg-accent/10 font-medium text-accent" : ""
                }`}
              >
                {item.icon}
              </Link>
            );
          })}
          <form action={user ? signOutAction : signInAction} className="contents">
            <button
              type="submit"
              aria-label={accountLabel}
              className="flex items-center justify-center rounded-md py-3 hover:bg-foreground/5"
            >
              <AccountIcon className="h-5 w-5" />
            </button>
          </form>
        </div>

        {/* Submenu: each expanded group's children, in their own row
            beneath the main grid — the mobile equivalent of the
            sidebar's inline-expanding sub-list. */}
        {mobileGroups.map(
          (group) =>
            expandedGroups.has(group.href) && (
              <div key={group.href} className="border-t border-border px-4 py-3">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {group.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label={child.label}
                      className={`flex items-center justify-center rounded-md py-3 hover:bg-foreground/5 ${
                        isActive(child.href) ? "bg-accent/10 font-medium text-accent" : ""
                      }`}
                    >
                      {child.icon}
                    </Link>
                  ))}
                </div>
              </div>
            ),
        )}
      </div>

      {/* Mobile: bottom bar acting as native app buttons */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border bg-surface md:hidden">
        {primaryMobileItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`flex flex-1 items-center justify-center hover:bg-foreground/5 ${
              isActive(item.href) ? "text-accent font-medium" : ""
            }`}
          >
            {item.icon}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="flex flex-1 items-center justify-center hover:bg-foreground/5"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close" : "Menu"}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <MenuIcon className="h-5 w-5" />
          )}
        </button>
      </nav>
    </div>
  );
}
