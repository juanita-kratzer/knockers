/**
 * Create PaymentIntent for deposit + platform fee. Client pays; funds held by platform.
 *
 * NOTE: The Stripe API call lives inside a Firestore transaction. This is technically
 * unsafe (transactions may retry, and Stripe calls have side effects). The idempotencyKey
 * guard prevents duplicate charges on retry. If restructuring, move the Stripe call
 * outside the transaction: read inside tx → call Stripe → write inside a second tx.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe, COL, PLATFORM_FEE_CENTS } from "../lib/config";
import { idempotencyKey } from "../lib/idempotency";

const BOOKING_STATUS = {
  DEPOSIT_PENDING: "deposit_pending",
};
const PAYMENT_STATUS = {
  UNPAID: "UNPAID",
  PAYMENT_INTENT_CREATED: "PAYMENT_INTENT_CREATED",
};

export async function createDepositPaymentIntent(
  bookingId: string,
  clientId: string
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const db = getFirestore();
  const stripe = getStripe();

  return await db.runTransaction(async (tx) => {
    const bookingRef = db.collection(COL.bookings).doc(bookingId);
    const bookingSnap = await tx.get(bookingRef);
    if (!bookingSnap.exists) throw new Error("Booking not found");
    const booking = bookingSnap.data()!;
    if (booking.clientId !== clientId) throw new Error("Only the client can pay for this booking");
    if (booking.status !== BOOKING_STATUS.DEPOSIT_PENDING) {
      throw new Error(`Booking status must be deposit_pending (current: ${booking.status})`);
    }
    const deadline = booking.depositDeadline?.toDate?.() ?? new Date(booking.depositDeadline);
    if (new Date() > deadline) throw new Error("Deposit deadline has expired");
    const depositCents = Math.round((booking.depositAmount ?? 0) * 100);
    if (depositCents <= 0) throw new Error("Booking has no deposit amount set");
    if (booking.paymentStatus === "DEPOSIT_PAID") {
      throw new Error("Deposit already paid");
    }
    if (booking.paymentStatus === "PAYMENT_INTENT_CREATED") {
      if (!booking.stripe?.paymentIntentId) {
        throw new Error("Booking marked as PAYMENT_INTENT_CREATED but has no paymentIntentId — contact support");
      }
      const pi = await stripe.paymentIntents.retrieve(booking.stripe.paymentIntentId);
      if (pi.status === "succeeded") throw new Error("Deposit already paid");
      return { clientSecret: pi.client_secret!, paymentIntentId: pi.id };
    }

    const entertainerId = booking.entertainerId as string | undefined;
    if (!entertainerId) throw new Error("Booking has no entertainer");
    const entertainerRef = db.collection(COL.entertainers).doc(entertainerId);
    const entSnap = await tx.get(entertainerRef);
    if (!entSnap.exists) throw new Error("Entertainer not found");
    const entertainer = entSnap.data()!;
    const connectAccountId = entertainer?.stripe?.connectAccountId as string | undefined;
    const payoutsEnabled = entertainer?.stripe?.payoutsEnabled === true;
    if (!connectAccountId || !payoutsEnabled) {
      throw new Error("Entertainer has not completed Stripe payout setup. They must connect Stripe in Finances to receive payments.");
    }

    const amountTotalCents = depositCents + PLATFORM_FEE_CENTS;
    const key = idempotencyKey("deposit", bookingId, "1");

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountTotalCents,
        currency: "aud",
        automatic_payment_methods: { enabled: true },
        transfer_data: { destination: connectAccountId },
        application_fee_amount: PLATFORM_FEE_CENTS,
        metadata: {
          bookingId,
          clientId,
          entertainerId,
        },
      },
      { idempotencyKey: key }
    );

    tx.update(bookingRef, {
      paymentStatus: PAYMENT_STATUS.PAYMENT_INTENT_CREATED,
      "stripe.paymentIntentId": paymentIntent.id,
      "stripe.amountDepositCents": depositCents,
      "stripe.amountPlatformFeeCents": PLATFORM_FEE_CENTS,
      "stripe.amountTotalCents": amountTotalCents,
      "stripe.connectedAccountId": connectAccountId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  });
}
