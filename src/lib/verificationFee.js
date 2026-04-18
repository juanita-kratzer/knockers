/**
 * Phase 6: Verification fee (Apple IAP) — gate for booking, posting, messaging.
 * User must have paid the $1.99 verification fee (or have it waived by admin) to use paid features.
 */

import { isAppleReviewAccount } from "./appleReview";

/**
 * Returns true if the user can use features that require verification fee (booking, posting, messaging).
 * @param {Record<string, unknown> | null | undefined} userData - Firestore user doc
 * @param {{ email?: string | null } | null | undefined} [user] - Optional Auth user; if Apple review account, always allowed
 */
export function canUsePaidFeatures(userData, user) {
  if (import.meta.env.DEV && import.meta.env.VITE_SKIP_IDENTITY_VERIFICATION === "true") return true;
  if (user && isAppleReviewAccount(user)) return true;
  if (!userData) return false;
  if (userData.verificationFeePaid === true) return true;
  if (userData.verificationFeeWaivedBy) return true;
  return false;
}

/** Message shown when user has not paid and is not waived */
export const VERIFICATION_REQUIRED_MESSAGE =
  "Pay the $1.99 verification fee to unlock messaging, bookings, and listings. Go to Settings → Verification.";
