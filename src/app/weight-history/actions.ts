"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logWeightEntry, setWeightGoal } from "@/lib/weight-history";

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

export interface SetGoalState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function setWeightGoalAction(
  _prevState: SetGoalState,
  formData: FormData,
): Promise<SetGoalState> {
  const session = await auth();
  if (!session?.user?.scopes.includes("admin")) {
    return { status: "error", message: "Forbidden" };
  }

  const target = Number(formData.get("target"));
  if (!Number.isFinite(target)) {
    return { status: "error", message: "Goal weight must be a number." };
  }

  await setWeightGoal(target);
  revalidatePath("/weight-history");
  return { status: "success" };
}
