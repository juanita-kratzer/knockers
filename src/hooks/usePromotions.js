/**
 * Phase 5: Fetch active promotions for the current user's role.
 */
import { useState, useEffect } from "react";
import { COL } from "../lib/collections";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export function usePromotions(targetRole) {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    const role = targetRole || "both";
    (async () => {
      const { db } = await import("../firebase");
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(db, COL.promotions), where("active", "==", true)));
      const now = new Date();
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => {
          const exp = p.expiry?.toDate?.() ?? p.expiry;
          if (exp && new Date(exp) < now) return false;
          const tr = p.targetRole || "both";
          return tr === "both" || tr === role;
        })
        .sort((a, b) => {
          const ea = a.expiry?.toDate?.() ?? a.expiry;
          const eb = b.expiry?.toDate?.() ?? b.expiry;
          return (eb ? new Date(eb).getTime() : 0) - (ea ? new Date(ea).getTime() : 0);
        });
      setPromotions(list);
    })().catch(() => setPromotions([])).finally(() => setLoading(false));
  }, [targetRole]);

  return { promotions, loading };
}
