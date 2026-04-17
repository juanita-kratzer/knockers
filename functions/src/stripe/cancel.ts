/**
 * Cancel booking with fees: client >72h ($80), <72h (full); entertainer cancel = refund + strike.
 * Phase 1: no charge to entertainer card; track strike + manual billing.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe, COL, PLATFORM_FEE_CENTS } from "../lib/config";
import { idempotencyKey } from "../lib/idempotency";

const BOOKING_STATUS = { CANCELLED: "cancelled" };
const CANCELLATION_FEE_CENTS_72H = 8000; // $80
const ENTERTAINER_COMP_72H_CENTS = 5000; // $50

type CancelledBy = "CLIENT" | "ENTERTAINER";

export async function cancelBookingWithFees(
  bookingId: string,
  cancelledBy: CancelledBy,
  _reason?: string
): Promise<{ refunded?: boolean; feeCharged?: number; strikeRecorded?: boolean }> {
  const db = getFirestore();
  const stripe = getStripe();

  return await db.runTransaction(async (tx) => {
    const bookingRef = db.collection(COL.bookings).doc(bookingId);
    const bookingSnap = await tx.get(bookingRef);
    if (!bookingSnap.exists) throw new Error("Booking not found");
    const booking = bookingSnap.data()!;
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return {};
    }

    const eventDate = booking.eventDate?.toDate?.() ?? new Date(booking.eventDate);
    const hoursUntilEvent = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60);
    const depositPaid = booking.paymentStatus === "DEPOSIT_PAID" && booking.stripe?.chargeId;
    const chargeId = booking.stripe?.chargeId;
    const depositCents = booking.stripe?.amountDepositCents ?? Math.round((booking.depositAmount ?? 0) * 100);
    const totalCents = booking.stripe?.amountTotalCents ?? Math.round((booking.totalAmount ?? 0) * 100);

    const cancellation: Record<string, unknown> = {
      cancelledBy,
      cancelledAt: FieldValue.serverTimestamp(),
      feeCents: 0,
      entertainerCompCents: 0,
      platformFeeCents: 0,
      stripeChargeOutcome: "NO_ACTION" as const,
    };

    let refunded = false;
    let feeCharged: number | undefined;
    let strikeRecorded = false;

    if (cancelledBy === "ENTERTAINER") {
      cancellation.stripeChargeOutcome = "REFUNDED";
      cancellation.entertainerCompCents = 0;
      cancellation.platformFeeCents = PLATFORM_FEE_CENTS;
      if (depositPaid && chargeId) {
        const key = idempotencyKey("refund", bookingId, "1");
        await stripe.refunds.create(
          { charge: chargeId, metadata: { bookingId, cancelledBy: "ENTERTAINER" } },
          { idempotencyKey: key }
        );
        refunded = true;
        cancellation.feeCents = 0;
      }
      strikeRecorded = true;
      // In Phase 1 we don't charge entertainer $30; record for manual billing
      await tx.set(
        db.collection(COL.entertainers).doc(booking.entertainerId).collection("strikes").doc(bookingId),
        { bookingId, cancelledAt: FieldValue.serverTimestamp(), penaltyCents: PLATFORM_FEE_CENTS, type: "CANCELLATION" }
      );
    } else {
      // CLIENT
      if (hoursUntilEvent <= 72) {
        cancellation.feeCents = totalCents;
        cancellation.entertainerCompCents = Math.max(0, totalCents - PLATFORM_FEE_CENTS);
        cancellation.platformFeeCents = PLATFORM_FEE_CENTS;
        if (depositPaid) {
          cancellation.stripeChargeOutcome = "CHARGED";
          feeCharged = totalCents;
          // Deposit already captured; no refund. Optionally charge remainder if total > deposit+platformFee (future).
        } else {
          cancellation.stripeChargeOutcome = "NO_ACTION";
          // Phase 1: we could create a new PaymentIntent for totalCents here; for now leave as NO_ACTION and document.
        }
      } else {
        cancellation.feeCents = CANCELLATION_FEE_CENTS_72H;
        cancellation.entertainerCompCents = ENTERTAINER_COMP_72H_CENTS;
        cancellation.platformFeeCents = PLATFORM_FEE_CENTS;
        if (depositPaid && depositCents >= CANCELLATION_FEE_CENTS_72H) {
          cancellation.stripeChargeOutcome = "CHARGED";
          feeCharged = CANCELLATION_FEE_CENTS_72H;
          const refundCents = depositCents + PLATFORM_FEE_CENTS - CANCELLATION_FEE_CENTS_72H;
          if (refundCents > 0 && chargeId) {
            const key = idempotencyKey("refund_partial", bookingId, "1");
            await stripe.refunds.create(
              { charge: chargeId, amount: refundCents, metadata: { bookingId } },
              { idempotencyKey: key }
            );
            refunded = true;
          }
        } else if (depositPaid && depositCents < CANCELLATION_FEE_CENTS_72H) {
          cancellation.stripeChargeOutcome = "CHARGED";
          feeCharged = depositCents + PLATFORM_FEE_CENTS;
        } else {
          cancellation.stripeChargeOutcome = "NO_ACTION";
        }
      }
    }

    tx.update(bookingRef, {
      status: BOOKING_STATUS.CANCELLED,
      cancellation,
      cancelledBy,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { refunded, feeCharged, strikeRecorded };
  });
}
