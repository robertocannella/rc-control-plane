import { firestore } from "@/lib/firestore";

export type Role = "admin" | "user";

interface UserRecord {
  email: string;
  name: string | null;
  role: Role;
  createdAt: FirebaseFirestore.Timestamp;
}

export async function getOrCreateUserRole(params: {
  id: string;
  email: string;
  name: string | null;
}): Promise<Role> {
  const ref = firestore.collection("users").doc(params.id);
  const snapshot = await ref.get();

  if (snapshot.exists) {
    return (snapshot.data() as UserRecord).role;
  }

  const role: Role = "user";
  await ref.set({
    email: params.email,
    name: params.name,
    role,
    createdAt: new Date(),
  });

  return role;
}
