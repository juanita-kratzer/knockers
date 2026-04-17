/**
 * Phase 6: Apple IAP — verify receipt after purchase.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";

const REGION = "australia-southeast1";

function getFunctionsWithRegion() {
  return getFunctions(app, REGION);
}

/**
 * Submit Apple IAP receipt for verification fee. On success, backend sets user.verificationFeePaid and records fee.
 * @param {string} receiptData - Base64-encoded receipt from StoreKit / Capacitor
 */
export async function verifyIAPReceipt(receiptData) {
  const fn = httpsCallable(getFunctionsWithRegion(), "verifyIAPReceiptCallable");
  const { data } = await fn({ receiptData });
  return data;
}
