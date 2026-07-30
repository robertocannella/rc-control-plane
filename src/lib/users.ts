import { firestore } from "@/lib/firestore";
import { SCOPES, isPostTypeScope, type Scope } from "@/lib/scopes";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  scopes: Scope[];
}

interface UserRecord {
  email: string;
  name: string | null;
  scopes?: Scope[];
  createdAt: FirebaseFirestore.Timestamp;
}

function sanitizeScopes(scopes: unknown): Scope[] {
  if (!Array.isArray(scopes)) return [];
  return scopes.filter(
    (scope): scope is Scope =>
      typeof scope === "string" &&
      ((SCOPES as readonly string[]).includes(scope) || isPostTypeScope(scope)),
  );
}

export async function getOrCreateUserScopes(params: {
  id: string;
  email: string;
  name: string | null;
}): Promise<Scope[]> {
  const ref = firestore.collection("users").doc(params.id);
  const snapshot = await ref.get();

  if (snapshot.exists) {
    return sanitizeScopes((snapshot.data() as UserRecord).scopes);
  }

  await ref.set({
    email: params.email,
    name: params.name,
    scopes: [],
    createdAt: new Date(),
  });

  return [];
}

export async function getUser(id: string): Promise<AppUser | null> {
  const snapshot = await firestore.collection("users").doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as UserRecord;
  return {
    id: snapshot.id,
    email: data.email,
    name: data.name,
    scopes: sanitizeScopes(data.scopes),
  };
}

export async function getUserScopes(id: string): Promise<Scope[]> {
  const snapshot = await firestore.collection("users").doc(id).get();
  if (!snapshot.exists) return [];
  return sanitizeScopes((snapshot.data() as UserRecord).scopes);
}

export async function listUsers(): Promise<AppUser[]> {
  const snapshot = await firestore.collection("users").orderBy("email").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() as UserRecord;
    return {
      id: doc.id,
      email: data.email,
      name: data.name,
      scopes: sanitizeScopes(data.scopes),
    };
  });
}

export async function setUserScopes(
  id: string,
  scopes: Scope[],
): Promise<void> {
  await firestore.collection("users").doc(id).update({ scopes });
}
