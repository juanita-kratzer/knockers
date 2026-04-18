/**
 * React hook for RevenueCat verification-fee purchase flow.
 * Handles purchase, restore, paywall, customer center, and Firestore sync.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  initRevenueCat,
  isNativeApp,
  purchaseVerification,
  restorePurchases as rcRestore,
  checkEntitlement,
  presentPaywall as rcPaywall,
  presentCustomerCenter as rcCustomerCenter,
} from "../lib/revenuecat";
import { confirmRevenueCatPurchase } from "../lib/iapCallables";
import { canUsePaidFeatures } from "../lib/verificationFee";

export default function useRevenueCat() {
  const { user, userData, refetchUserData } = useAuth();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState(null);
  const initRef = useRef(false);

  const isEntitled = canUsePaidFeatures(userData, user);
  const native = isNativeApp();

  useEffect(() => {
    if (!user?.uid || !native || initRef.current) return;
    initRef.current = true;
    initRevenueCat(user.uid).then(() => {
      syncIfNeeded();
    });
  }, [user?.uid, native]);

  /** If RevenueCat says entitled but Firestore disagrees, heal the gap. */
  const syncIfNeeded = useCallback(async () => {
    if (!native || isEntitled) return;
    try {
      const entitled = await checkEntitlement();
      if (entitled) {
        await confirmRevenueCatPurchase();
        await refetchUserData?.();
      }
    } catch {
      // silent — sync is best-effort
    }
  }, [native, isEntitled, refetchUserData]);

  /** Trigger the verification-fee purchase, then sync Firestore. */
  const purchase = useCallback(async () => {
    setError(null);
    setPurchasing(true);
    try {
      const result = await purchaseVerification();
      if (result.cancelled) {
        return false;
      }
      if (!result.success) {
        setError(result.error || "Purchase failed.");
        return false;
      }
      await confirmRevenueCatPurchase();
      await refetchUserData?.();
      return true;
    } catch (err) {
      setError(err?.message || "Something went wrong.");
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [refetchUserData]);

  /** Restore previous purchases and sync if entitled. */
  const restore = useCallback(async () => {
    setError(null);
    setRestoring(true);
    try {
      const result = await rcRestore();
      if (!result.success) {
        setError(result.error || "Restore failed.");
        return false;
      }
      if (result.entitled) {
        await confirmRevenueCatPurchase();
        await refetchUserData?.();
        return true;
      }
      setError("No previous purchases found.");
      return false;
    } catch (err) {
      setError(err?.message || "Restore failed.");
      return false;
    } finally {
      setRestoring(false);
    }
  }, [refetchUserData]);

  /** Show the native RevenueCat Paywall and sync after. */
  const showPaywall = useCallback(async () => {
    setError(null);
    const result = await rcPaywall();
    if (result.entitled && !isEntitled) {
      await confirmRevenueCatPurchase();
      await refetchUserData?.();
    }
    return result.entitled;
  }, [isEntitled, refetchUserData]);

  /** Open RevenueCat Customer Center (manage purchases / support). */
  const showCustomerCenter = useCallback(async () => {
    await rcCustomerCenter();
  }, []);

  return {
    native,
    isEntitled,
    purchasing,
    restoring,
    error,
    purchase,
    restore,
    showPaywall,
    showCustomerCenter,
    clearError: () => setError(null),
  };
}
