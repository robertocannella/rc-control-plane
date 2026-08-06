import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/toast-provider";
import type { Session } from "next-auth";
import { AppShell, type NavItem } from "@/components/app-shell";
import { auth, signIn, signOut } from "@/auth";
import { listPostTypes } from "@/lib/post-types";
import { canViewPostType } from "@/lib/content-access";
import { getPostTypeIcon } from "@/lib/post-type-icons";
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

  if (session?.user) {
    // The hub only lists post types you can edit; still worth a top-level
    // link for admins/editors even though direct post-type links (below)
    // cover plain viewing for everyone.
    items.push({
      href: "/content",
      label: "Content",
      icon: <Layers className={NAV_ICON_CLASS} />,
    });
  }

  const postTypes = (await listPostTypes()).filter((postType) =>
    canViewPostType(postType, session),
  );
  for (const postType of postTypes) {
    const Icon = getPostTypeIcon(postType.icon);
    items.push({
      href: `/content/${postType.slug}`,
      label: postType.label,
      icon: <Icon className={NAV_ICON_CLASS} />,
    });
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

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <AppShell
            navItems={navItems}
            user={session?.user}
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
        </ToastProvider>
      </body>
    </html>
  );
}
