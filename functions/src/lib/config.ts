/**
 * Config: Firestore collection suffix (empty = prod, _dev = dev) and Stripe.
 * Set via Firebase config (firebase functions:config:set) or .env (emulator).
 * Stripe client is lazy-initialized so deploy/analyze does not require keys.
 */
import * as functions from "firebase-functions";
import Stripe from "stripe";

const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
const suffix = isEmulator || process.env.NODE_ENV === "development" ? "_dev" : "";

export const COL = {
  bookings: `bookings${suffix}`,
  entertainers: `entertainers${suffix}`,
  payments: `payments${suffix}`,
  users: `users${suffix}`,
  adminLogs: `adminLogs${suffix}`,
  disputes: `disputes${suffix}`,
  ratings: `ratings${suffix}`,
  safetyAlerts: `safetyAlerts${suffix}`,
  finances: `finances${suffix}`,
  fees: `fees${suffix}`,
};

export const PLATFORM_FEE_CENTS = 3000;
export const VERIFICATION_FEE_CENTS = 199;
export const IAP_PRODUCT_ID_VERIFICATION = "com.knockers.app.verificationfee";

function firebaseConfig(): { stripe?: { webhook_secret?: string; secret_key?: string } } {
  try {
    return functions.config() as { stripe?: { webhook_secret?: string; secret_key?: string } };
  } catch {
    return {};
  }
}

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY ?? firebaseConfig().stripe?.secret_key;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? firebaseConfig().stripe?.webhook_secret;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return secret;
}

export function isStripeEnabled(): boolean {
  return process.env.STRIPE_ENABLED === "true";
}

/** RevenueCat secret API key (server-side). Required for confirmVerificationPurchaseCallable. */
export function getRevenueCatSecretKey(): string {
  const secret = process.env.REVENUECAT_SECRET_KEY ?? (functions.config() as { revenuecat?: { secret_key?: string } }).revenuecat?.secret_key;
  if (!secret) throw new Error("REVENUECAT_SECRET_KEY is not set");
  return secret;
}

/** Apple IAP shared secret (App Store Connect). Required for verifyIAPReceiptCallable. */
export function getAppleIAPSharedSecret(): string {
  const secret = process.env.APPLE_IAP_SHARED_SECRET ?? (functions.config() as { apple?: { iap_shared_secret?: string } }).apple?.iap_shared_secret;
  if (!secret) throw new Error("APPLE_IAP_SHARED_SECRET is not set");
  return secret;
}

let _stripe: Stripe | null = null;
/** Lazy Stripe client so keys are only read when a function runs (not at deploy/analyze). */
export function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(getStripeSecretKey(), { apiVersion: "2023-10-16" });
  return _stripe;
}
