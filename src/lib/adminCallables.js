/**
 * Phase 4.5: Admin Cloud Callables. Only call when user is admin (guard in UI).
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";

const REGION = "australia-southeast1";

function getFunctionsWithRegion() {
  return getFunctions(app, REGION);
}

export async function setUserRole(targetUid, newRole) {
  const fn = httpsCallable(getFunctionsWithRegion(), "setUserRoleCallable");
  const { data } = await fn({ targetUid, newRole });
  return data;
}

export async function adminRefundBooking(bookingId, refundType, reason) {
  const fn = httpsCallable(getFunctionsWithRegion(), "adminRefundBookingCallable");
  const { data } = await fn({ bookingId, refundType, reason });
  return data;
}

export async function adminResolveDispute(disputeId, outcome, notes) {
  const fn = httpsCallable(getFunctionsWithRegion(), "adminResolveDisputeCallable");
  const { data } = await fn({ disputeId, outcome, notes });
  return data;
}

export async function adminFreezeBooking(bookingId, freeze, reason) {
  const fn = httpsCallable(getFunctionsWithRegion(), "adminFreezeBookingCallable");
  const { data } = await fn({ bookingId, freeze, reason });
  return data;
}

export async function adjustEntertainerBalance(entertainerId, deltaCents, reason) {
  const fn = httpsCallable(getFunctionsWithRegion(), "adjustEntertainerBalanceCallable");
  const { data } = await fn({ entertainerId, deltaCents, reason });
  return data;
}

export async function issueStrike(targetUid, reason, relatedBookingId) {
  const fn = httpsCallable(getFunctionsWithRegion(), "issueStrikeCallable");
  const { data } = await fn({ targetUid, reason, relatedBookingId });
  return data;
}
