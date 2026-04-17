/**
 * Release payout to entertainer when booking is completed.
 * Transfer deposit (minus platform fee already taken at charge) to Connect account.
 *
 * NOTE: The Stripe transfer call lives inside a Firestore transaction. The idempotencyKey
 * prevents duplicate transfers on retry. For a future refactor, consider reading inside
 * one transaction, calling Stripe outside, and writing in a second transaction.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe, COL } from "../lib/config";
import { idempotencyKey } from "../lib/idempotency";

const BOOKING_STATUS = { COMPLETED: "completed" };
const PAYMENT_STATUS = { DEPOSIT_PAID: "DEPOSIT_PAID", PAYOUT_SENT: "PAYOUT_SENT" };

export async function releasePayoutOnCompletion(bookingId: string, entertainerId: string): Promise<{ transferId: string }> {
  const db = getFirestore();
  const stripe = getStripe();

  return await db.runTransaction(async (tx) => {
    const bookingRef = db.collection(COL.bookings).doc(bookingId);
    const bookingSnap = await tx.get(bookingRef);
    if (!bookingSnap.exists) throw new Error("Booking not found");
    const booking = bookingSnap.data()!;
    if (booking.entertainerId !== entertainerId) throw new Error("Only the entertainer can release payout");
    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      throw new Error(`Booking must be completed (current: ${booking.status})`);
    }
    if (booking.paymentStatus === PAYMENT_STATUS.PAYOUT_SENT) {
      const existingTransferId = booking.stripe?.transferId;
      if (!existingTransferId) throw new Error("Booking marked as PAYOUT_SENT but has no transferId — contact support");
      return { transferId: existingTransferId };
    }
    if (booking.paymentStatus !== PAYMENT_STATUS.DEPOSIT_PAID) {
      throw new Error("Deposit must be paid before payout");
    }

    const entertainerRef = db.collection(COL.entertainers).doc(entertainerId);
    const entSnap = await tx.get(entertainerRef);
    if (!entSnap.exists) throw new Error("Entertainer not found");
    const ent = entSnap.data()!;
    const connectAccountId = ent?.stripe?.connectAccountId;
    if (!connectAccountId) throw new Error("Entertainer has not set up payouts");
    if (!ent?.stripe?.payoutsEnabled) throw new Error("Entertainer payouts are not enabled yet");

    const amountToEntertainerCents = booking.stripe?.amountDepositCents ?? Math.round((booking.depositAmount ?? 0) * 100);
    if (amountToEntertainerCents <= 0) throw new Error("No deposit amount to transfer");

    const chargeId = booking.stripe?.chargeId;
    if (!chargeId) throw new Error("No charge id on booking");

    const key = idempotencyKey("payout", bookingId, "1");
    const transfer = await stripe.transfers.create(
      {
        amount: amountToEntertainerCents,
        currency: "aud",
        destination: connectAccountId,
        source_transaction: chargeId,
        metadata: { bookingId, entertainerId },
      },
      { idempotencyKey: key }
    );

    tx.update(bookingRef, {
      paymentStatus: PAYMENT_STATUS.PAYOUT_SENT,
      "stripe.transferId": transfer.id,
      "payout.releasedAt": FieldValue.serverTimestamp(),
      "payout.amountToEntertainerCents": amountToEntertainerCents,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { transferId: transfer.id };
  });
}
