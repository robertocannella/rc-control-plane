import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/toast-provider";
import { AppShell, type NavItem } from "@/components/app-shell";
import { auth, signOut } from "@/auth";
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

function buildNavItems(scopes: string[]): NavItem[] {
  const items: NavItem[] = [{ href: "/", label: "Home" }];
  if (scopes.includes("admin")) {
    items.push({ href: "/admin", label: "Admin" });
  }
  return items;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          {session?.user ? (
            <AppShell
              navItems={buildNavItems(session.user.scopes)}
              user={session.user}
              signOutAction={async () => {
                "use server";
                await signOut();
              }}
            >
              {children}
            </AppShell>
          ) : (
            children
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
