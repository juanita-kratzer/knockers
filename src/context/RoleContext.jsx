// src/context/RoleContext.jsx
// Role-based access control context

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { logger } from "../lib/logger";
import { isAppleReviewAccount, verifyAppleReviewDualRole } from "../lib/appleReview";

export const ROLES = {
  CLIENT: "client",
  ENTERTAINER: "entertainer",
  ADMIN: "admin",
};

const RoleContext = createContext({
  role: null,
  isClient: false,
  isEntertainer: false,
  isAdmin: false,
  hasEntertainerProfile: false,
  ageVerified: false,
  setRole: () => {},
  verifyAge: () => {},
  loading: true,
});

export const useRole = () => useContext(RoleContext);

export default function RoleProvider({ children }) {
  const { user, userData, loading: authLoading, isConfigured } = useAuth();
  const [role, setRoleState] = useState(null);
  const [hasEntertainerProfile, setHasEntertainerProfile] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const entertainerUnsubRef = useRef(null);

  // Sync role from userData
  useEffect(() => {
    if (authLoading) return;

    // If Firebase isn't configured, just stop loading
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    if (!user || !userData) {
      setRoleState(null);
      setHasEntertainerProfile(false);
      setAgeVerified(false);
      setLoading(false);
      return;
    }

    setRoleState(userData.role || null);
    setAgeVerified(userData.ageVerified || false);
    if (userData.hasEntertainerProfile) setHasEntertainerProfile(true);
    setLoading(false);

    // Apple review account: treat as having entertainer profile so they can switch Client/Entertainer (isolated override)
    const isAppleReview = isAppleReviewAccount(user);
    if (isAppleReview) setHasEntertainerProfile(true);

    // Keep hasEntertainerProfile in sync via snapshot (don't block loading on this)
    entertainerUnsubRef.current = null;
    const checkEntertainerProfile = async () => {
      try {
        const { db } = await import("../firebase");
        const { doc, onSnapshot } = await import("firebase/firestore");
        const { COL } = await import("../lib/collections");

        const entertainerRef = doc(db, COL.entertainers, user.uid);
        const unsub = onSnapshot(
          entertainerRef,
          (snap) => setHasEntertainerProfile(isAppleReview || snap.exists()),
          () => setHasEntertainerProfile(isAppleReview)
        );
        entertainerUnsubRef.current = unsub;
      } catch (e) {
        logger.error("Error checking entertainer profile:", e);
      }
    };
    checkEntertainerProfile();

    return () => {
      if (entertainerUnsubRef.current) {
        entertainerUnsubRef.current();
        entertainerUnsubRef.current = null;
      }
    };
  }, [user, userData, authLoading, isConfigured]);

  // DEV-only: verify Apple review account has both roles configured (logs warning if not)
  useEffect(() => {
    if (user && userData && !authLoading) {
      verifyAppleReviewDualRole(user, userData, hasEntertainerProfile);
    }
  }, [user, userData, hasEntertainerProfile, authLoading]);

  // Set user role
  const setRole = async (newRole) => {
    if (!user || !isConfigured) return;
    
    try {
      const { db } = await import("../firebase");
      const { doc, updateDoc } = await import("firebase/firestore");
      const { COL } = await import("../lib/collections");
      
      const userRef = doc(db, COL.users, user.uid);
      await updateDoc(userRef, { role: newRole });
      setRoleState(newRole);
    } catch (e) {
      logger.error("Error setting role:", e);
    }
  };

  // Verify age (for adult content access)
  const verifyAge = async () => {
    // Allow local age verification even without Firebase
    setAgeVerified(true);
    
    if (!user || !isConfigured) return;
    
    try {
      const { db } = await import("../firebase");
      const { doc, updateDoc } = await import("firebase/firestore");
      const { COL } = await import("../lib/collections");
      
      const userRef = doc(db, COL.users, user.uid);
      await updateDoc(userRef, { ageVerified: true });
    } catch (e) {
      logger.error("Error verifying age:", e);
    }
  };

  const value = {
    role,
    isClient: role === ROLES.CLIENT,
    isEntertainer: role === ROLES.ENTERTAINER,
    isAdmin: role === ROLES.ADMIN,
    hasEntertainerProfile,
    ageVerified,
    setRole,
    verifyAge,
    loading: loading || authLoading,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}
