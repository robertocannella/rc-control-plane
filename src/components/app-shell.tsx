"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Menu as MenuIcon,
  X,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  // A pre-rendered icon element (e.g. <Home className="h-5 w-5 shrink-0" />)
  // rather than a component reference — the latter isn't serializable
  // across the server/client boundary when passed down from layout.tsx.
  icon: ReactNode;
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
  signOutAction?: () => void;
  signInAction?: () => void;
}

// Bottom bar shows the first few items directly; "Menu" always expands the rest
// plus account actions, so sign-out stays reachable even with few nav items.
const MOBILE_PRIMARY_COUNT = 3;

function UserAvatarFallback({ label }: { label: string }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-semibold dark:bg-white/10">
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

export function AppShell({
  children,
  navItems,
  user,
  signOutAction,
  signInAction,
}: AppShellProps) {
  const pathname = usePathname();
  const [tabletExpanded, setTabletExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const primaryMobileItems = navItems.slice(0, MOBILE_PRIMARY_COUNT);
  const AccountIcon = user ? LogOut : LogIn;
  const accountLabel = user ? "Sign out" : "Sign in";

  return (
    <div className="flex min-h-full flex-1">
      {/* Sidebar: hidden on mobile, collapsed-by-default on tablet, always expanded on desktop */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-black/10 transition-all duration-200 md:flex dark:border-white/10 ${
          tabletExpanded ? "md:w-64" : "md:w-16 lg:w-64"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-3">
          <span
            className={`truncate text-sm font-semibold ${
              tabletExpanded ? "inline" : "hidden lg:inline"
            }`}
          >
            Control Plane
          </span>
          <button
            type="button"
            onClick={() => setTabletExpanded((v) => !v)}
            className="rounded-md p-1.5 hover:bg-black/5 lg:hidden dark:hover:bg-white/10"
            aria-label={tabletExpanded ? "Collapse menu" : "Expand menu"}
          >
            {tabletExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 ${
                isActive(item.href) ? "bg-black/10 font-medium dark:bg-white/15" : ""
              }`}
            >
              {item.icon}
              <span className={tabletExpanded ? "inline" : "hidden lg:inline"}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-black/10 px-2 py-2 dark:border-white/10">
          {user && (
            <div className="flex items-center gap-3 px-2 py-2 text-sm">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="h-6 w-6 shrink-0 rounded-full"
                />
              ) : (
                <UserAvatarFallback label={user.name ?? user.email ?? "?"} />
              )}
              <span
                className={`truncate ${tabletExpanded ? "inline" : "hidden lg:inline"}`}
              >
                {user.name ?? user.email}
              </span>
            </div>
          )}
          <form action={user ? signOutAction : signInAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              <AccountIcon className="h-5 w-5 shrink-0" />
              <span className={tabletExpanded ? "inline" : "hidden lg:inline"}>
                {accountLabel}
              </span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main content: scrolls with the actual document on mobile (so the
          browser chrome can auto-hide), but scrolls internally at md+ so
          the sidebar stays pinned. */}
      <main className="min-w-0 flex-1 pb-16 md:overflow-auto md:pb-0">
        {children}
      </main>

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
        className={`fixed inset-x-0 bottom-16 z-30 rounded-t-2xl border-t border-black/10 bg-background shadow-lg transition-transform duration-200 md:hidden dark:border-white/10 ${
          mobileMenuOpen
            ? "translate-y-0"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <div className="grid grid-cols-3 gap-2 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              aria-label={item.label}
              className={`flex items-center justify-center rounded-md py-3 hover:bg-black/5 dark:hover:bg-white/10 ${
                isActive(item.href) ? "bg-black/10 font-medium dark:bg-white/15" : ""
              }`}
            >
              {item.icon}
            </Link>
          ))}
          <form
            action={user ? signOutAction : signInAction}
            className="contents"
          >
            <button
              type="submit"
              aria-label={accountLabel}
              className="flex items-center justify-center rounded-md py-3 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <AccountIcon className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Mobile: bottom bar acting as native app buttons */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-black/10 bg-background md:hidden dark:border-white/10">
        {primaryMobileItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`flex flex-1 items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 ${
              isActive(item.href) ? "font-medium" : ""
            }`}
          >
            {item.icon}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="flex flex-1 items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"
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
