/**
 * Stripe Identity verification — gate for listings, bookings, payout, messaging.
 * User must have completed Stripe Identity (ID + selfie for entertainers, ID for clients).
 */

import { isAppleReviewAccount } from "./appleReview";

/**
 * Returns true if the user has completed basic identity verification (ID + selfie).
 * @param {Record<string, unknown> | null | undefined} userData - Firestore user doc
 * @param {{ email?: string | null } | null | undefined} [user] - Optional Auth user; Apple review account is always allowed
 */
export function isIdentityVerified(userData, user) {
  if (import.meta.env.DEV && import.meta.env.VITE_SKIP_IDENTITY_VERIFICATION === "true") return true;
  if (user && isAppleReviewAccount(user)) return true;
  if (!userData) return false;
  const status = userData.verification?.status;
  return status === "verified";
}

/**
 * Returns true if the user has an approved police check (hard verified profile).
 * @param {Record<string, unknown> | null | undefined} userData - Firestore user doc
 */
export function isHardVerified(userData) {
  if (!userData) return false;
  return userData.policeCheck?.status === "approved";
}

/** Message shown when user has not completed identity verification */
export const IDENTITY_VERIFICATION_REQUIRED_MESSAGE =
  "Verify your identity with ID (and selfie for entertainers) to continue. Go to Profile → Verification & Badges.";
