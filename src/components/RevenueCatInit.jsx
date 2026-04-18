/**
 * Invisible component that initializes RevenueCat once the user is authenticated.
 * Also auto-heals: if RC says entitled but Firestore disagrees, syncs the flag.
 */

import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { initRevenueCat, isNativeApp, checkEntitlement } from "../lib/revenuecat";
import { confirmRevenueCatPurchase } from "../lib/iapCallables";
import { canUsePaidFeatures } from "../lib/verificationFee";

export default function RevenueCatInit() {
  const { user, userData, refetchUserData } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!user?.uid || !isNativeApp() || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      await initRevenueCat(user.uid);

      if (!canUsePaidFeatures(userData, user)) {
        try {
          const entitled = await checkEntitlement();
          if (entitled) {
            await confirmRevenueCatPurchase();
            await refetchUserData?.();
          }
        } catch {
          // silent — auto-heal is best-effort
        }
      }
    })();
  }, [user?.uid]);

  return null;
}
