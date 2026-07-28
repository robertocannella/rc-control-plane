import { Firestore } from "@google-cloud/firestore";

declare global {
  var firestore: Firestore | undefined;
}

export const firestore = global.firestore ?? new Firestore();

if (process.env.NODE_ENV !== "production") {
  global.firestore = firestore;
}
