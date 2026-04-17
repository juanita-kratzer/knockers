/**
 * Phase 1: Call Cloud Functions for Stripe Connect and payments.
 * Only call when isStripeEnabled() and Firebase is configured.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";
import { isStripeEnabled } from "./featureFlags";

const REGION = "australia-southeast1";

function getFunctionsWithRegion() {
  return getFunctions(app, REGION);
}

export async function createConnectAccount(entertainerId) {
  if (!isStripeEnabled()) throw new Error("Stripe is not enabled");
  const fn = httpsCallable(getFunctionsWithRegion(), "createConnectAccountCallable");
  const { data } = await fn({ entertainerId });
  return data;
}

export async function getConnectOnboardingLink(entertainerId) {
  if (!isStripeEnabled()) throw new Error("Stripe is not enabled");
  const fn = httpsCallable(getFunctionsWithRegion(), "getConnectOnboardingLinkCallable");
  const { data } = await fn({ entertainerId });
  return data;
}

export async function createDepositPaymentIntent(bookingId) {
  if (!isStripeEnabled()) throw new Error("Stripe is not enabled");
  const fn = httpsCallable(getFunctionsWithRegion(), "createDepositPaymentIntentCallable");
  const { data } = await fn({ bookingId });
  return data;
}

export async function releasePayoutOnCompletion(bookingId) {
  if (!isStripeEnabled()) throw new Error("Stripe is not enabled");
  const fn = httpsCallable(getFunctionsWithRegion(), "releasePayoutOnCompletionCallable");
  const { data } = await fn({ bookingId });
  return data;
}

export async function cancelBookingWithFees(bookingId, cancelledBy, reason) {
  if (!isStripeEnabled()) throw new Error("Stripe is not enabled");
  const fn = httpsCallable(getFunctionsWithRegion(), "cancelBookingWithFeesCallable");
  const { data } = await fn({ bookingId, cancelledBy, reason });
  return data;
}

/** Stripe Identity: create VerificationSession; returns { client_secret, sessionId }. */
export async function createVerificationSession(role) {
  const fn = httpsCallable(getFunctionsWithRegion(), "createVerificationSessionCallable");
  const { data } = await fn({ role: role === "entertainer" ? "entertainer" : "client" });
  return data;
}
