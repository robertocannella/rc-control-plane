"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getUserScopes, setUserScopes } from "@/lib/users";
import { SCOPES, type Scope } from "@/lib/scopes";

export interface UpdateScopesState {
  status: "idle" | "success" | "error";
  message?: string;
  adminGranted?: boolean;
  adminRevoked?: boolean;
}

export async function updateUserScopes(
  userId: string,
  _prevState: UpdateScopesState,
  formData: FormData,
): Promise<UpdateScopesState> {
  const session = await auth();

  if (!session?.user?.scopes.includes("admin")) {
    return { status: "error", message: "Forbidden" };
  }

  const previousScopes = await getUserScopes(userId);

  const submitted = formData.getAll("scopes");
  let scopes: Scope[] = SCOPES.filter((scope) => submitted.includes(scope));

  // Never let an admin remove their own admin scope: there's no other way
  // to regain it short of editing Firestore directly.
  if (userId === session.user.id && !scopes.includes("admin")) {
    scopes = [...scopes, "admin"];
  }

  await setUserScopes(userId, scopes);
  revalidatePath("/admin/users");

  const wasAdmin = previousScopes.includes("admin");
  const isAdmin = scopes.includes("admin");

  return {
    status: "success",
    adminGranted: !wasAdmin && isAdmin,
    adminRevoked: wasAdmin && !isAdmin,
  };
}
