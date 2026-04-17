// src/lib/adminLog.js
// Admin audit trail - log actions to adminLogs collection

import { logger } from "./logger";

const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY;

/**
 * Log an admin action for audit trail.
 * @param {string} actorId - UID of admin performing the action
 * @param {string} action - Action type (e.g. 'ban', 'refund', 'safety_escalate', 'balance_adjust')
 * @param {string} [targetId] - ID of target (userId, bookingId, etc.)
 * @param {object} [metadata] - Additional context
 */
export async function logAdminAction(actorId, action, targetId = null, metadata = {}) {
  if (!isFirebaseConfigured()) {
    logger.log("[AdminLog]", action, { actorId, targetId, metadata });
    return;
  }
  try {
    const { db } = await import("../firebase");
    const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
    const { COL } = await import("../lib/collections");

    await addDoc(collection(db, COL.adminLogs), {
      action,
      actorId,
      targetId: targetId || null,
      metadata,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    logger.error("Failed to write admin log:", e);
  }
}
