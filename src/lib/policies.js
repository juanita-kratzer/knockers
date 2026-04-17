// src/lib/policies.js
// Single source of truth for cancellation and platform fee policy.
// Phase 6: All digital access fees use Apple IAP; real-world service payments use Stripe.

/**
 * Fee constants (Phase 6 — Apple-compliant monetisation).
 * signupVerification: $2 AUD via Apple IAP (non-consumable).
 * bookingPlatform: $30 AUD via Stripe on each booking deposit.
 */
export const FEES = {
  /** Signup/verification fee in cents — Apple IAP only */
  signupVerification: 200,
  /** Booking platform fee in cents — Stripe */
  bookingPlatform: 3000,
};

/**
 * Cancellation and platform fee policy.
 * Backend (functions) uses platformFeeCents = FEES.bookingPlatform.
 */
export const CANCELLATION_POLICY = {
  userCancelWithinHours: 72,
  userCancelOutsideFeeCents: 8000,
  entertainerCancelFeeCents: 3000,
  platformFeeCents: FEES.bookingPlatform,
};

/** Platform fee in dollars for display */
export const PLATFORM_FEE_DOLLARS = FEES.bookingPlatform / 100;

/** Verification fee in dollars for display */
export const VERIFICATION_FEE_DOLLARS = FEES.signupVerification / 100;

/** User cancel outside window fee in dollars for display */
export const USER_CANCEL_OUTSIDE_FEE_DOLLARS = CANCELLATION_POLICY.userCancelOutsideFeeCents / 100;

/**
 * If true, allow contact info (phone/email/@) in chat only when booking is DEPOSIT_PAID/IN_PROGRESS/COMPLETED.
 * If false, block contact info everywhere (listings, notes, bio, chat).
 */
export const ALLOW_CONTACT_INFO_AFTER_DEPOSIT = true;
