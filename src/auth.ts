import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getOrCreateUserScopes } from "@/lib/users";

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
        token.scopes = await getOrCreateUserScopes({
          id: profile.sub,
          email: profile.email,
          name: profile.name ?? null,
        });
      }
      return token;
    },
    async session({ session, token }) {
      session.user.scopes = token.scopes ?? [];
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
