import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AppUser = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
};

export async function getUserById(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AppUser) : null;
}