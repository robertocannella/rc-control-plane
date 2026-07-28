import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/users";

declare module "@auth/core/types" {
  interface Session {
    user: {
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
  }
}
