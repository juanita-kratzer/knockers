/**
 * Stripe Identity: create VerificationSession for ID + optional selfie.
 * Secret key from env only; never exposed to client.
 */

import Stripe from "stripe";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COL } from "../lib/config";

/** Rate limit: min seconds between creating sessions per user */
const RATE_LIMIT_SECONDS = 60;

export async function createVerificationSession(
  uid: string,
  role: "client" | "entertainer",
  email: string,
  getStripe: () => Stripe
): Promise<{ client_secret: string; sessionId: string }> {
  const stripe = getStripe();
  const db = getFirestore();

  const userRef = db.collection(COL.users).doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error("User not found");

  const userData = userSnap.data()!;
  const lastCreatedAt = (userData.verification?.lastSessionCreatedAt as { toMillis?: () => number } | undefined)?.toMillis?.();
  if (lastCreatedAt && Date.now() - lastCreatedAt < RATE_LIMIT_SECONDS * 1000) {
    throw new Error("Please wait a moment before starting another verification.");
  }

  const requireSelfie = role === "entertainer";

  const verificationSession = await stripe.identity.verificationSessions.create({
    type: "document",
    ...(requireSelfie
      ? { options: { document: { require_matching_selfie: true } } }
      : {}),
    provided_details: { email: email || undefined },
    metadata: { user_id: uid, role },
  });

  const sessionId = verificationSession.id;
  const clientSecret = verificationSession.client_secret;
  if (!clientSecret) throw new Error("No client_secret returned");

  // Store sessionId on user for webhook; lastSessionCreatedAt for rate limiting
  await userRef.update({
    "verification.sessionId": sessionId,
    "verification.status": "pending",
    "verification.provider": "stripe",
    "verification.lastSessionCreatedAt": FieldValue.serverTimestamp(),
    "verification.updatedAt": FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { client_secret: clientSecret, sessionId };
}
