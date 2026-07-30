"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
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

function NavIcon({ label }: { label: string }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/10 text-xs font-semibold dark:bg-white/10">
      {label.charAt(0)}
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
            {tabletExpanded ? "«" : "»"}
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
              <NavIcon label={item.label} />
              <span className={tabletExpanded ? "inline" : "hidden lg:inline"}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-black/10 px-2 py-2 dark:border-white/10">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-2 py-2 text-sm">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded-full"
                  />
                ) : (
                  <NavIcon label={user.name ?? user.email ?? "?"} />
                )}
                <span
                  className={`truncate ${tabletExpanded ? "inline" : "hidden lg:inline"}`}
                >
                  {user.name ?? user.email}
                </span>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <NavIcon label="Sign out" />
                  <span
                    className={tabletExpanded ? "inline" : "hidden lg:inline"}
                  >
                    Sign out
                  </span>
                </button>
              </form>
            </>
          ) : (
            <form action={signInAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                <NavIcon label="Sign in" />
                <span className={tabletExpanded ? "inline" : "hidden lg:inline"}>
                  Sign in
                </span>
              </button>
            </form>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-auto pb-16 md:pb-0">
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
              className={`flex flex-col items-center gap-1 rounded-md py-3 text-xs hover:bg-black/5 dark:hover:bg-white/10 ${
                isActive(item.href) ? "bg-black/10 font-medium dark:bg-white/15" : ""
              }`}
            >
              <NavIcon label={item.label} />
              {item.label}
            </Link>
          ))}
          <form
            action={user ? signOutAction : signInAction}
            className="contents"
          >
            <button
              type="submit"
              className="flex flex-col items-center gap-1 rounded-md py-3 text-xs hover:bg-black/5 dark:hover:bg-white/10"
            >
              <NavIcon label={user ? "Sign out" : "Sign in"} />
              {user ? "Sign out" : "Sign in"}
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
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs hover:bg-black/5 dark:hover:bg-white/10 ${
              isActive(item.href) ? "font-medium" : ""
            }`}
          >
            <NavIcon label={item.label} />
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
          aria-expanded={mobileMenuOpen}
        >
          <NavIcon label="Menu" />
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>
      </nav>
    </div>
  );
}
