/**
 * Admin helpers: require caller to be admin, write audit log.
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import { COL } from "./config";

export async function requireAdmin(context: functions.https.CallableContext): Promise<string> {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
  const uid = context.auth.uid;
  const db = getFirestore();
  const userSnap = await db.collection(COL.users).doc(uid).get();
  const role = userSnap.exists ? (userSnap.data()?.role as string) : null;
  if (role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin only");
  }
  return uid;
}

export async function writeAdminLog(
  db: Firestore,
  actorId: string,
  action: string,
  targetId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  await db.collection(COL.adminLogs).add({
    action,
    actorId,
    targetId: targetId ?? null,
    metadata,
    createdAt: FieldValue.serverTimestamp(),
  });
}
