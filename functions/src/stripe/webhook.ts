/**
 * Stripe webhook: payment_intent.succeeded / payment_intent.payment_failed;
 * identity.verification_session.* ; account.updated (Connect).
 * Updates booking paymentStatus, user verification, and entertainer Connect status.
 */

import Stripe from "stripe";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import { getStripeWebhookSecret, COL, PLATFORM_FEE_CENTS } from "../lib/config";
import { syncConnectAccountStatus } from "./connect";

const BOOKING_STATUS = { DEPOSIT_PAID: "deposit_paid" };
const PAYMENT_STATUS = { DEPOSIT_PAID: "DEPOSIT_PAID", PAYMENT_INTENT_CREATED: "PAYMENT_INTENT_CREATED" };

async function updateUserVerificationFromSession(
  db: Firestore,
  session: Stripe.Identity.VerificationSession
): Promise<void> {
  const uid = session.metadata?.user_id as string | undefined;
  if (!uid) return;
  const status = session.status;
  const firestoreStatus =
    status === "verified"
      ? "verified"
      : status === "requires_input"
        ? "failed"
        : status === "canceled"
          ? "canceled"
          : "pending";
  try {
    const userRef = db.collection(COL.users).doc(uid);
    await userRef.update({
      "verification.status": firestoreStatus,
      "verification.sessionId": session.id,
      "verification.provider": "stripe",
      "verification.updatedAt": FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to update verification for user ${uid}:`, err);
  }
}

export function getStripeWebhookHandler(getStripe: () => Stripe) {
  const db = getFirestore();

  return async (req: { rawBody?: Buffer; body?: string; headers: { [k: string]: string } }) => {
    const stripe = getStripe();
    const secret = getStripeWebhookSecret();
    const sig = req.headers["stripe-signature"];
    if (!sig) throw new Error("Missing stripe-signature");
    const rawBody = req.rawBody ?? (typeof req.body === "string" ? Buffer.from(req.body, "utf8") : req.body);
    if (!rawBody) throw new Error("Missing body");
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    } catch (err: unknown) {
      throw new Error(`Webhook signature verification failed: ${(err as Error).message}`);
    }

    switch (event.type) {
      case "identity.verification_session.verified":
      case "identity.verification_session.requires_input":
      case "identity.verification_session.canceled": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        await updateUserVerificationFromSession(db, session);
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata?.bookingId;
        if (!bookingId) break;
        const bookingRef = db.collection(COL.bookings).doc(bookingId);
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(bookingRef);
          if (!snap.exists) return;
          const data = snap.data()!;
          if (data.paymentStatus === PAYMENT_STATUS.DEPOSIT_PAID) return;
          if (data.stripe?.paymentIntentId !== pi.id) return;
          const chargeId = pi.latest_charge;
          tx.update(bookingRef, {
            paymentStatus: PAYMENT_STATUS.DEPOSIT_PAID,
            status: BOOKING_STATUS.DEPOSIT_PAID,
            "stripe.chargeId": typeof chargeId === "string" ? chargeId : chargeId?.id ?? null,
            depositPaidAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          const clientId = pi.metadata?.clientId ?? data.clientId;
          tx.set(db.collection(COL.fees).doc(), {
            type: "booking_stripe",
            userId: clientId,
            bookingId,
            amountCents: PLATFORM_FEE_CENTS,
            provider: "stripe",
            referenceId: pi.id,
            createdAt: FieldValue.serverTimestamp(),
          });
        });
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata?.bookingId;
        if (!bookingId) break;
        const failRef = db.collection(COL.bookings).doc(bookingId);
        const failSnap = await failRef.get();
        if (failSnap.exists && failSnap.data()?.stripe?.paymentIntentId === pi.id) {
          await failRef.update({
            paymentStatus: "PAYMENT_FAILED",
            paymentFailedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await syncConnectAccountStatus(account.id);
        break;
      }
      case "capability.updated": {
        const cap = event.data.object as Stripe.Capability;
        const accountId = typeof cap.account === "string" ? cap.account : (cap.account as Stripe.Account)?.id;
        if (accountId) await syncConnectAccountStatus(accountId);
        break;
      }
      default:
        break;
    }
    return { received: true };
  };
}
