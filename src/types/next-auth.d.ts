import type { DefaultSession } from "next-auth";
import type { Scope } from "@/lib/scopes";

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      scopes: Scope[];
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    scopes?: Scope[];
  }
}
