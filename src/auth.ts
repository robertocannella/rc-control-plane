import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getOrCreateUserRole } from "@/lib/users";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile?.sub && profile.email) {
        token.role = await getOrCreateUserRole({
          id: profile.sub,
          email: profile.email,
          name: profile.name ?? null,
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (token.role) {
        session.user.role = token.role;
      }
      return session;
    },
  },
});
