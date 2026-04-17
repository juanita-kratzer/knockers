// Centralised verification fee gate — returns boolean + modal state
// UI components call requireVerification() before paid actions;
// Firestore rules remain as backend enforcement.

import { useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { canUsePaidFeatures } from "../lib/verificationFee";

export default function useVerificationGate() {
  const { user, userData } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const isPaid = canUsePaidFeatures(userData, user);

  const requireVerification = useCallback(() => {
    if (isPaid) return true;
    setShowModal(true);
    return false;
  }, [isPaid]);

  const dismissModal = useCallback(() => setShowModal(false), []);

  return { isPaid, showModal, requireVerification, dismissModal };
}
