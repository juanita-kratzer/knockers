/**
 * RevenueCat integration for Apple IAP verification fee.
 * Wraps @revenuecat/purchases-capacitor for use in React/Capacitor.
 */

import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";
import { RevenueCatUI } from "@revenuecat/purchases-capacitor-ui";
import { Capacitor } from "@capacitor/core";

const ENTITLEMENT_ID = "Knockers Pro";

const API_KEY =
  import.meta.env.VITE_REVENUECAT_API_KEY || "appl_UfmUSKKcCHIfzJQUmviYKCfbkXZ";

let _configured = false;

/** True when running inside the native iOS/Android shell (not a browser). */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/**
 * Configure RevenueCat SDK. Must be called once after the user signs in.
 * @param {string} firebaseUid - Firebase Auth UID used as the RC app user ID.
 */
export async function initRevenueCat(firebaseUid) {
  if (!isNativeApp() || _configured) return;
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({
      apiKey: API_KEY,
      appUserID: firebaseUid,
    });
    _configured = true;
  } catch (err) {
    console.error("[RevenueCat] configure failed:", err);
  }
}

/**
 * Check whether the current user has the "Knockers Pro" entitlement.
 * @returns {Promise<boolean>}
 */
export async function checkEntitlement() {
  if (!isNativeApp()) return false;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (err) {
    console.error("[RevenueCat] checkEntitlement failed:", err);
    return false;
  }
}

/**
 * Purchase the verification fee (lifetime non-consumable).
 * Fetches the default offering's "lifetime" package and initiates the purchase.
 * @returns {Promise<{ success: boolean; customerInfo?: object; cancelled?: boolean; error?: string }>}
 */
export async function purchaseVerification() {
  if (!isNativeApp()) {
    return { success: false, error: "In-app purchases are only available on the iOS app." };
  }
  try {
    const { offerings } = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) {
      return { success: false, error: "No offerings available. Please try again later." };
    }
    const lifetimePkg = current.lifetime;
    if (!lifetimePkg) {
      return { success: false, error: "Verification product not found. Please try again later." };
    }
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: lifetimePkg });
    const entitled = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { success: entitled, customerInfo };
  } catch (err) {
    if (err?.code === "1" || err?.userCancelled) {
      return { success: false, cancelled: true };
    }
    console.error("[RevenueCat] purchaseVerification failed:", err);
    return { success: false, error: err?.message || "Purchase failed. Please try again." };
  }
}

/**
 * Restore previous purchases (e.g. after reinstall).
 * @returns {Promise<{ success: boolean; entitled: boolean; error?: string }>}
 */
export async function restorePurchases() {
  if (!isNativeApp()) {
    return { success: false, entitled: false, error: "Only available on the iOS app." };
  }
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const entitled = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { success: true, entitled };
  } catch (err) {
    console.error("[RevenueCat] restorePurchases failed:", err);
    return { success: false, entitled: false, error: err?.message || "Restore failed." };
  }
}

/**
 * Present the native RevenueCat Paywall (designed in RC dashboard).
 * @returns {Promise<{ success: boolean; entitled: boolean }>}
 */
export async function presentPaywall() {
  if (!isNativeApp()) return { success: false, entitled: false };
  try {
    await RevenueCatUI.presentPaywall();
    const entitled = await checkEntitlement();
    return { success: true, entitled };
  } catch (err) {
    console.error("[RevenueCat] presentPaywall failed:", err);
    return { success: false, entitled: false };
  }
}

/**
 * Present the native RevenueCat Customer Center (manage purchases / support).
 */
export async function presentCustomerCenter() {
  if (!isNativeApp()) return;
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (err) {
    console.error("[RevenueCat] presentCustomerCenter failed:", err);
  }
}
