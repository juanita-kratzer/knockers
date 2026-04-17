/**
 * Apple App Store review account support.
 * Isolated overrides only for apple-review@knockers.app so reviewers can access
 * both Client and Entertainer flows. No backdoors; no impact on normal users.
 */

import { logger } from "./logger";

/** Email for the dedicated Apple review account (dual-role access). */
export const APPLE_REVIEW_EMAIL = "apple-review@knockers.app";

/**
 * Returns true if the given auth user is the Apple review account.
 * @param {{ email?: string | null } | null | undefined} user - Firebase Auth user or { email }
 */
export function isAppleReviewAccount(user) {
  return !!user?.email && user.email.toLowerCase() === APPLE_REVIEW_EMAIL.toLowerCase();
}

/**
 * DEV-only: Verifies that the Apple review account has both roles enabled in Firestore
 * (user.role set and entertainer doc exists) so they can switch between Client and Entertainer.
 * Logs a warning if misconfigured. No-op in production.
 */
export function verifyAppleReviewDualRole(user, userData, hasEntertainerProfile) {
  if (!isAppleReviewAccount(user)) return;
  const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV === true;
  if (!isDev) return;

  const hasRole = userData?.role === "client" || userData?.role === "entertainer";
  if (!hasRole || !hasEntertainerProfile) {
    logger.warn(
      "[Apple Review] apple-review@knockers.app should have both roles: ensure users/{uid} has role 'client' or 'entertainer' and entertainers/{uid} exists. Currently: role=%s, hasEntertainerProfile=%s",
      userData?.role ?? "null",
      hasEntertainerProfile
    );
  }
}
