"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logWeightEntry } from "@/lib/weight-history";

export interface LogWeightState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function logWeightAction(
  _prevState: LogWeightState,
  formData: FormData,
): Promise<LogWeightState> {
  const session = await auth();
  if (!session?.user?.scopes.includes("admin")) {
    return { status: "error", message: "Forbidden" };
  }

  const date = formData.get("date");
  if (typeof date !== "string" || !date) {
    return { status: "error", message: "Date is required." };
  }

  const total = Number(formData.get("total"));
  if (!Number.isFinite(total)) {
    return { status: "error", message: "Weight must be a number." };
  }

  await logWeightEntry(date, total);
  revalidatePath("/weight-history");
  return { status: "success" };
}
