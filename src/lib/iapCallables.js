/**
 * Phase 6: Apple IAP — verify receipt / confirm RevenueCat purchase.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";

const REGION = "australia-southeast1";

function getFunctionsWithRegion() {
  return getFunctions(app, REGION);
}

/**
 * Submit Apple IAP receipt for verification fee (legacy direct Apple validation).
 * @param {string} receiptData - Base64-encoded receipt from StoreKit / Capacitor
 */
export async function verifyIAPReceipt(receiptData) {
  const fn = httpsCallable(getFunctionsWithRegion(), "verifyIAPReceiptCallable");
  const { data } = await fn({ receiptData });
  return data;
}

/**
 * Confirm verification fee purchase via RevenueCat entitlement.
 * Called after a successful RevenueCat purchase or restore.
 * Backend verifies the entitlement via RC REST API and sets verificationFeePaid.
 */
export async function confirmRevenueCatPurchase() {
  const fn = httpsCallable(getFunctionsWithRegion(), "confirmVerificationPurchaseCallable");
  const { data } = await fn({});
  return data;
}
