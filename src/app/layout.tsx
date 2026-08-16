import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/toast-provider";
import { InstallPrompt } from "@/components/install-prompt";
import type { Session } from "next-auth";
import { AppShell, type NavItem, type NavGroup } from "@/components/app-shell";
import { auth, signIn, signOut } from "@/auth";
import { listPostTypes } from "@/lib/post-types";
import { canViewPostType } from "@/lib/content-access";
import { resolveLucideIcon } from "@/lib/post-type-icons";
import { THEME_COOKIE_NAME, isThemeName } from "@/lib/theme";
import { Home, Layers, Scale, Shield } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roberto Cannella",
  description: "Sign in with Google",
  appleWebApp: {
    capable: true,
    title: "Control Plane",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#16324F",
};

const NAV_ICON_CLASS = "h-5 w-5 shrink-0";

async function buildNavItems(session: Session | null): Promise<NavItem[]> {
  const items: NavItem[] = [
    { href: "/", label: "Home", icon: <Home className={NAV_ICON_CLASS} /> },
  ];

  if (session?.user?.scopes.includes("admin")) {
    items.push({
      href: "/admin",
      label: "Admin",
      icon: <Shield className={NAV_ICON_CLASS} />,
    });
    items.push({
      href: "/weight-history",
      label: "Weight History",
      icon: <Scale className={NAV_ICON_CLASS} />,
    });
  }

  const postTypes = (await listPostTypes()).filter((postType) =>
    canViewPostType(postType, session),
  );

  if (postTypes.length > 0) {
    const children = await Promise.all(
      postTypes.map(async (postType) => {
        const Icon = await resolveLucideIcon(postType.icon);
        return {
          href: `/content/${postType.slug}`,
          label: postType.label,
          icon: <Icon className={NAV_ICON_CLASS} />,
        };
      }),
    );

    if (session?.user) {
      // A single collapsible "Content" group replaces what used to be one
      // flat nav link per post type — the group's own label doubles as a
      // real link to the /content hub, with the post types themselves as
      // its expandable children.
      const group: NavGroup = {
        href: "/content",
        label: "Content",
        icon: <Layers className={NAV_ICON_CLASS} />,
        children,
      };
      items.push(group);
    } else {
      // The /content hub requires a session (redirects signed-out users
      // to "/"), so a group whose own link is a dead end would be
      // confusing — guests browsing guest-visible post types get flat
      // direct links instead, same as before this change.
      items.push(...children);
    }
  }

  return items;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const navItems = await buildNavItems(session);
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const theme = isThemeName(themeCookie) ? themeCookie : null;

  return (
    <html
      lang="en"
      data-theme={theme ?? undefined}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <AppShell
            navItems={navItems}
            user={session?.user}
            initialTheme={theme}
            signOutAction={
              session?.user
                ? async () => {
                    "use server";
                    await signOut();
                  }
                : undefined
            }
            signInAction={
              !session?.user
                ? async () => {
                    "use server";
                    await signIn("google");
                  }
                : undefined
            }
          >
            {children}
          </AppShell>
          <InstallPrompt />
        </ToastProvider>
      </body>
    </html>
  );
}
