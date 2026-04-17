// src/hooks/useAdminUsers.js
// Admin: list users and perform actions (suspend, ban, warn, reset strikes)
// TODO: These functions write directly to Firestore from the client. Security relies on
// Firestore rules. Migrate to server-side callables for better audit/validation.

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { COL } from "../lib/collections";
import { logAdminAction } from "../lib/adminLog";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

export function useAdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured() || !user) {
      setUsers([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const { db } = await import("../firebase");
        const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
        const snap = await getDocs(query(collection(db, COL.users), orderBy("createdAt", "desc")));
        if (!mounted) return;
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError(null);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, refetchTrigger]);

  const refetch = () => setRefetchTrigger((n) => n + 1);
  return { users, loading, error, refetch };
}

export async function adminUpdateUser(uid, updates) {
  if (!isFirebaseConfigured()) return;
  const { db } = await import("../firebase");
  const { doc, updateDoc, serverTimestamp, getDoc } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");
  const withTimestamp = { ...updates, updatedAt: serverTimestamp() };
  const userRef = doc(db, COL.users, uid);
  await updateDoc(userRef, withTimestamp);
  const entRef = doc(db, COL.entertainers, uid);
  const entSnap = await getDoc(entRef);
  if (entSnap.exists()) {
    const entUpdates = {};
    if ("strikes" in updates) entUpdates.strikes = updates.strikes;
    if ("isSuspended" in updates) entUpdates.isSuspended = updates.isSuspended;
    if ("isBanned" in updates) entUpdates.isBanned = updates.isBanned;
    if ("suspendedAt" in updates) entUpdates.suspendedAt = updates.suspendedAt;
    if ("bannedAt" in updates) entUpdates.bannedAt = updates.bannedAt;
    if (Object.keys(entUpdates).length) await updateDoc(entRef, entUpdates);
  }
}

export async function adminSuspendUser(actorId, targetId, reason = "") {
  const { serverTimestamp } = await import("firebase/firestore");
  await adminUpdateUser(targetId, { isSuspended: true, suspendedAt: serverTimestamp(), suspendReason: reason });
  await logAdminAction(actorId, "suspend_user", targetId, { reason });
}

export async function adminBanUser(actorId, targetId, reason = "") {
  const { serverTimestamp } = await import("firebase/firestore");
  await adminUpdateUser(targetId, { isBanned: true, bannedAt: serverTimestamp(), banReason: reason });
  await logAdminAction(actorId, "ban_user", targetId, { reason });
}

const STRIKES_AUTO_SUSPEND = 3;
const STRIKES_AUTO_BAN = 5;

export async function adminWarnUser(actorId, targetId, reason = "") {
  const { db } = await import("../firebase");
  const { doc, getDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { COL } = await import("../lib/collections");
  const userRef = doc(db, COL.users, targetId);
  const snap = await getDoc(userRef);
  const current = (snap.exists() && snap.data().strikes) || 0;
  const next = current + 1;
  const updates = {
    strikes: next,
    lastWarnAt: serverTimestamp(),
    lastWarnReason: reason,
    ...(next >= STRIKES_AUTO_BAN ? { isBanned: true, bannedAt: serverTimestamp(), banReason: `Auto: ${next} strikes` } : {}),
    ...(next >= STRIKES_AUTO_SUSPEND && next < STRIKES_AUTO_BAN ? { isSuspended: true, suspendedAt: serverTimestamp(), suspendReason: `Auto: ${next} strikes` } : {}),
  };
  await updateDoc(userRef, updates);
  await logAdminAction(actorId, "warn_user", targetId, { reason, strikesAfter: next });
}

export async function adminResetStrikes(actorId, targetId) {
  await adminUpdateUser(targetId, { strikes: 0 });
  await logAdminAction(actorId, "reset_strikes", targetId, {});
}

export async function adminUnsuspendUser(actorId, targetId) {
  await adminUpdateUser(targetId, { isSuspended: false, suspendedAt: null, suspendReason: null });
  await logAdminAction(actorId, "unsuspend_user", targetId, {});
}

export async function adminUnbanUser(actorId, targetId) {
  await adminUpdateUser(targetId, { isBanned: false, bannedAt: null, banReason: null });
  await logAdminAction(actorId, "unban_user", targetId, {});
}

/** Phase 6: Waive verification fee so user can book/message/post without IAP */
export async function adminWaiveVerification(actorId, targetId) {
  await adminUpdateUser(targetId, { verificationFeeWaivedBy: actorId });
  await logAdminAction(actorId, "waive_verification", targetId, {});
}

export async function adminUnwaiveVerification(actorId, targetId) {
  await adminUpdateUser(targetId, { verificationFeeWaivedBy: null });
  await logAdminAction(actorId, "unwaive_verification", targetId, {});
}
