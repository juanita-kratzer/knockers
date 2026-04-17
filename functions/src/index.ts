/**
 * Phase 1: Stripe Connect + Deposit Escrow + Payout + Cancellation.
 * All payment state is server-authoritative; idempotent where specified.
 * ensureUserProfile: create/merge user doc so Auth-only users (e.g. test accounts) can log in.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { COL, VERIFICATION_FEE_CENTS, IAP_PRODUCT_ID_VERIFICATION, getAppleIAPSharedSecret } from "./lib/config";
import { getStripe } from "./lib/config";
import { verifyAppleReceipt } from "./iap/apple";
import { requireAdmin, writeAdminLog } from "./lib/admin";
import { createConnectAccount, getConnectOnboardingLink } from "./stripe/connect";
import { createDepositPaymentIntent } from "./stripe/deposit";
import { getStripeWebhookHandler } from "./stripe/webhook";
import { releasePayoutOnCompletion } from "./stripe/payout";
import { cancelBookingWithFees } from "./stripe/cancel";
import { createVerificationSession } from "./stripe/identity";

admin.initializeApp();

const VALID_ROLES = ["client", "entertainer", "admin"] as const;
const STRIKES_SUSPEND = 3;
const STRIKES_BAN = 5;

/** Callable: ensure current user has a Firestore user doc; returns profile so client can skip Firestore read. */
export const ensureUserProfileCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { useDev?: boolean; displayName?: string; photoURL?: string; phone?: string } | null, context) => {
    console.log("ensureUserProfileCallable called");
    console.log("UID:", context.auth?.uid);
    console.log("Data:", data);
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    const uid = context.auth.uid;
    const token = context.auth.token;
    const email = (token?.email as string) ?? "";
    const { useDev, displayName, photoURL, phone } = data ?? {};
    const usersCol = useDev ? "users_dev" : COL.users;
    console.log("Writing to collection:", usersCol);
    const ref = admin.firestore().collection(usersCol).doc(uid);
    const snap = await ref.get();
    const now = admin.firestore.FieldValue.serverTimestamp();
    if (!snap.exists) {
      await ref.set({
        uid,
        email,
        name: displayName ?? "",
        phone: phone ?? "",
        photoURL: photoURL ?? "",
        role: null,
        hasEntertainerProfile: false,
        ageVerified: false,
        verification: {
          status: "unverified",
          provider: "stripe",
          updatedAt: now,
        },
        createdAt: now,
      }, { merge: true });
    } else {
      const existing = snap.data() ?? {};
      const updates: Record<string, unknown> = {
        email: email || existing.email,
        name: displayName ?? existing.name ?? "",
        phone: phone ?? existing.phone ?? "",
        photoURL: photoURL ?? existing.photoURL ?? "",
      };
      if (existing.verification === undefined) {
        updates.verification = {
          status: "unverified",
          provider: "stripe",
          updatedAt: now,
        };
      }
      await ref.set(updates, { merge: true });
    }
    const after = await ref.get();
    const d = after.exists ? after.data() : {};
    return {
      ok: true,
      role: d?.role ?? null,
      hasEntertainerProfile: d?.hasEntertainerProfile ?? false,
    };
  }
);

/** Test account email – only this account can call bootstrapTestAccountCallable. */
const TEST_ACCOUNT_EMAIL = process.env.TEST_ACCOUNT_EMAIL || "apple-review@knockers.app";

/** Apple review account: never auto-ban or auto-suspend so App Store review can access both roles. */
const APPLE_REVIEW_EMAIL = "apple-review@knockers.app";
function isAppleReviewEmail(email: string | undefined | null): boolean {
  return !!email && email.toLowerCase() === APPLE_REVIEW_EMAIL.toLowerCase();
}

/**
 * Callable: one-off bootstrap for the test account (Apple review / QA).
 * When the test account user calls this, ensures they have both client + entertainer profiles
 * (user doc with role "client" and an entertainer doc) so they can switch dashboards.
 */
export const bootstrapTestAccountCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { useDev?: boolean } | null, context) => {
    try {
      if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
      const email = (context.auth.token?.email as string) || "";
      if (email.toLowerCase() !== TEST_ACCOUNT_EMAIL.toLowerCase()) {
        throw new functions.https.HttpsError("permission-denied", "Only the test account can run this");
      }
      const uid = context.auth.uid;
      const useDev = data?.useDev ?? false;
      const usersCol = useDev ? "users_dev" : COL.users;
      const entertainersCol = useDev ? "entertainers_dev" : COL.entertainers;
      const db = admin.firestore();
      const now = admin.firestore.FieldValue.serverTimestamp();

      const userRef = db.collection(usersCol).doc(uid);
      const entRef = db.collection(entertainersCol).doc(uid);

      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        await userRef.set({
          uid,
          email,
          name: "Test Account",
          phone: "",
          photoURL: "",
          role: "client",
          hasEntertainerProfile: true,
          ageVerified: false,
          createdAt: now,
        }, { merge: true });
      } else {
        await userRef.set({ role: "client", hasEntertainerProfile: true }, { merge: true });
      }

      const entSnap = await entRef.get();
      if (!entSnap.exists) {
        await entRef.set({
          userId: uid,
          displayName: "Test Entertainer",
          bio: "Test account for Apple review and QA.",
          suburb: "",
          categories: [],
          subCategories: [],
          profileType: "soft",
          isActive: false,
          isAdultContent: false,
          verificationStatus: "pending",
          rating: 0,
          reviewCount: 0,
          bookingCount: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      return { ok: true, message: "Test account has both client and entertainer profiles." };
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code?.startsWith("functions/")) {
        throw err;
      }
      console.error("bootstrapTestAccountCallable error:", err);
      const msg = err instanceof Error ? err.message : "Bootstrap failed";
      throw new functions.https.HttpsError("internal", msg);
    }
  }
);

// Callable: create Connect account for entertainer (or return fresh link)
export const createConnectAccountCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { entertainerId?: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    const uid = context.auth.uid;
    const entertainerId = data?.entertainerId ?? uid;
    if (entertainerId !== uid) throw new functions.https.HttpsError("permission-denied", "Can only create for self");
    const email = (context.auth.token?.email as string) ?? "";
    return createConnectAccount(entertainerId, email);
  }
);

export const getConnectOnboardingLinkCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { entertainerId?: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    const uid = context.auth.uid;
    const entertainerId = data?.entertainerId ?? uid;
    if (entertainerId !== uid) throw new functions.https.HttpsError("permission-denied", "Can only get link for self");
    return getConnectOnboardingLink(entertainerId);
  }
);

export const createDepositPaymentIntentCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { bookingId: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    const bookingId = data?.bookingId;
    if (!bookingId) throw new functions.https.HttpsError("invalid-argument", "bookingId required");
    return createDepositPaymentIntent(bookingId, context.auth.uid);
  }
);

export const releasePayoutOnCompletionCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { bookingId: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    const bookingId = data?.bookingId;
    if (!bookingId) throw new functions.https.HttpsError("invalid-argument", "bookingId required");
    return releasePayoutOnCompletion(bookingId, context.auth.uid);
  }
);

export const cancelBookingWithFeesCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { bookingId: string; cancelledBy: "CLIENT" | "ENTERTAINER"; reason?: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    const { bookingId, cancelledBy, reason } = data ?? {};
    if (!bookingId || !cancelledBy) {
      throw new functions.https.HttpsError("invalid-argument", "bookingId and cancelledBy required");
    }
    return cancelBookingWithFees(bookingId, cancelledBy, reason);
  }
);

// ---------- Phase 4.5: Admin callables ----------

export const setUserRoleCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { targetUid: string; newRole: string }, context) => {
    const actorId = await requireAdmin(context);
    const { targetUid, newRole } = data ?? {};
    if (!targetUid || !newRole) {
      throw new functions.https.HttpsError("invalid-argument", "targetUid and newRole required");
    }
    if (!VALID_ROLES.includes(newRole as (typeof VALID_ROLES)[number])) {
      throw new functions.https.HttpsError("invalid-argument", "newRole must be client, entertainer, or admin");
    }
    const db = getFirestore();
    const userRef = db.collection(COL.users).doc(targetUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new functions.https.HttpsError("not-found", "User not found");
    const previousRole = (userSnap.data()?.role as string) ?? null;
    await userRef.update({ role: newRole, updatedAt: FieldValue.serverTimestamp() });
    const entRef = db.collection(COL.entertainers).doc(targetUid);
    const entSnap = await entRef.get();
    if (entSnap.exists) {
      await entRef.update({ updatedAt: FieldValue.serverTimestamp() });
    }
    await writeAdminLog(db, actorId, "set_user_role", targetUid, { previousRole, newRole });
    return { ok: true };
  }
);

export const adminRefundBookingCallable = functions.region("australia-southeast1").https.onCall(
  async (
    data: { bookingId: string; reason?: string; refundType: "full" | "partial" | "deposit" },
    context
  ) => {
    const actorId = await requireAdmin(context);
    const { bookingId, reason, refundType } = data ?? {};
    if (!bookingId || !refundType) {
      throw new functions.https.HttpsError("invalid-argument", "bookingId and refundType required");
    }
    const db = getFirestore();
    const stripe = getStripe();
    const bookingRef = db.collection(COL.bookings).doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) throw new functions.https.HttpsError("not-found", "Booking not found");
    const booking = bookingSnap.data()!;
    const chargeId = booking.stripe?.chargeId;
    if (!chargeId) throw new functions.https.HttpsError("failed-precondition", "No charge to refund");
    if (booking.status === "refunded") {
      throw new functions.https.HttpsError("failed-precondition", "Booking already refunded");
    }
    const depositCents = booking.stripe?.amountDepositCents ?? Math.round((booking.depositAmount ?? 0) * 100);
    const totalCents = booking.stripe?.amountTotalCents ?? Math.round((booking.totalAmount ?? 0) * 100);
    const amountCents =
      refundType === "deposit" || refundType === "partial" ? depositCents : totalCents;
    await stripe.refunds.create({
      charge: chargeId,
      amount: amountCents,
      metadata: { bookingId, adminId: actorId },
      reason: "requested_by_customer",
    });
    await bookingRef.update({
      status: "refunded",
      refund: {
        amount: amountCents / 100,
        amountCents,
        reason: reason ?? "",
        at: FieldValue.serverTimestamp(),
        adminId: actorId,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    await writeAdminLog(db, actorId, "admin_refund", bookingId, {
      reason,
      refundType,
      amountCents,
    });
    return { ok: true };
  }
);

export const adminResolveDisputeCallable = functions.region("australia-southeast1").https.onCall(
  async (
    data: { disputeId: string; outcome: "uphold" | "dismiss" | "modify"; notes?: string },
    context
  ) => {
    const actorId = await requireAdmin(context);
    const { disputeId, outcome, notes } = data ?? {};
    if (!disputeId || !outcome) {
      throw new functions.https.HttpsError("invalid-argument", "disputeId and outcome required");
    }
    const db = getFirestore();
    const disputeRef = db.collection(COL.disputes).doc(disputeId);
    const disputeSnap = await disputeRef.get();
    if (!disputeSnap.exists) throw new functions.https.HttpsError("not-found", "Dispute not found");
    const dispute = disputeSnap.data()!;
    await disputeRef.update({
      status: outcome === "dismiss" ? "dismissed" : "resolved",
      outcome,
      notes: notes ?? "",
      resolvedAt: FieldValue.serverTimestamp(),
      resolvedBy: actorId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const ratingId = dispute.ratingId ?? dispute.targetId;
    if (ratingId && (outcome === "uphold" || outcome === "modify")) {
      const ratingRef = db.collection(COL.ratings).doc(ratingId);
      await ratingRef.update({ hiddenByAdmin: true, updatedAt: FieldValue.serverTimestamp() });
    }
    let strikeTargetUid: string | null = null;
    if (outcome === "uphold" && ratingId) {
      const ratingSnap = await db.collection(COL.ratings).doc(ratingId).get();
      strikeTargetUid = ratingSnap.exists ? (ratingSnap.data()?.reviewerId as string) ?? null : null;
    }
    if (strikeTargetUid) {
      const userRef = db.collection(COL.users).doc(strikeTargetUid);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        const skipAutoBanSuspend = isAppleReviewEmail(userData?.email as string | undefined);
        const current = (userData?.strikes as number) ?? 0;
        const next = current + 1;
        const userUpdates: Record<string, unknown> = {
          strikes: next,
          lastWarnAt: FieldValue.serverTimestamp(),
          lastWarnReason: "Dispute upheld",
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (!skipAutoBanSuspend) {
          if (next >= STRIKES_BAN) {
            userUpdates.isBanned = true;
            userUpdates.bannedAt = FieldValue.serverTimestamp();
            userUpdates.banReason = `Auto: ${next} strikes`;
          } else if (next >= STRIKES_SUSPEND) {
            userUpdates.isSuspended = true;
            userUpdates.suspendedAt = FieldValue.serverTimestamp();
            userUpdates.suspendReason = `Auto: ${next} strikes`;
          }
        }
        await userRef.update(userUpdates);
        const entRef = db.collection(COL.entertainers).doc(strikeTargetUid);
        const entSnap = await entRef.get();
        if (entSnap.exists) {
          const entUpdates: Record<string, unknown> = {
            strikes: next,
            updatedAt: FieldValue.serverTimestamp(),
          };
          if (!skipAutoBanSuspend) {
            if (next >= STRIKES_BAN) {
              entUpdates.isBanned = true;
              entUpdates.bannedAt = FieldValue.serverTimestamp();
            } else if (next >= STRIKES_SUSPEND) {
              entUpdates.isSuspended = true;
              entUpdates.suspendedAt = FieldValue.serverTimestamp();
            }
          }
          await entRef.update(entUpdates);
        }
      }
    }
    await writeAdminLog(db, actorId, "admin_resolve_dispute", disputeId, { outcome, notes });
    return { ok: true };
  }
);

export const adminFreezeBookingCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { bookingId: string; freeze: boolean; reason?: string }, context) => {
    const actorId = await requireAdmin(context);
    const { bookingId, freeze, reason } = data ?? {};
    if (!bookingId || typeof freeze !== "boolean") {
      throw new functions.https.HttpsError("invalid-argument", "bookingId and freeze (boolean) required");
    }
    const db = getFirestore();
    const bookingRef = db.collection(COL.bookings).doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) throw new functions.https.HttpsError("not-found", "Booking not found");
    await bookingRef.update({
      isFrozen: freeze,
      freezeReason: reason ?? "",
      frozenAt: freeze ? FieldValue.serverTimestamp() : null,
      frozenBy: freeze ? actorId : null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await writeAdminLog(db, actorId, "admin_freeze_booking", bookingId, { freeze, reason });
    return { ok: true };
  }
);

export const adjustEntertainerBalanceCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { entertainerId: string; deltaCents: number; reason?: string }, context) => {
    const actorId = await requireAdmin(context);
    const { entertainerId, deltaCents, reason } = data ?? {};
    if (!entertainerId || typeof deltaCents !== "number") {
      throw new functions.https.HttpsError("invalid-argument", "entertainerId and deltaCents required");
    }
    const db = getFirestore();
    let previous = 0;
    await db.runTransaction(async (tx) => {
      const entRef = db.collection(COL.entertainers).doc(entertainerId);
      const entSnap = await tx.get(entRef);
      previous = (entSnap.exists ? (entSnap.data()?.balanceCents as number) : 0) ?? 0;
      const next = previous + deltaCents;
      tx.update(entRef, {
        balanceCents: next,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await writeAdminLog(db, actorId, "adjust_balance", entertainerId, {
      deltaCents,
      previous,
      next: previous + deltaCents,
      reason,
    });
    return { ok: true };
  }
);

export const issueStrikeCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { targetUid: string; reason?: string; relatedBookingId?: string }, context) => {
    const actorId = await requireAdmin(context);
    const { targetUid, reason, relatedBookingId } = data ?? {};
    if (!targetUid) throw new functions.https.HttpsError("invalid-argument", "targetUid required");
    const db = getFirestore();
    const userRef = db.collection(COL.users).doc(targetUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new functions.https.HttpsError("not-found", "User not found");
    const userData = userSnap.data();
    const skipAutoBanSuspend = isAppleReviewEmail(userData?.email as string | undefined);
    const current = (userData?.strikes as number) ?? 0;
    const next = current + 1;
    const userUpdates: Record<string, unknown> = {
      strikes: next,
      lastWarnAt: FieldValue.serverTimestamp(),
      lastWarnReason: reason ?? "",
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!skipAutoBanSuspend) {
      if (next >= STRIKES_BAN) {
        userUpdates.isBanned = true;
        userUpdates.bannedAt = FieldValue.serverTimestamp();
        userUpdates.banReason = `Auto: ${next} strikes`;
      } else if (next >= STRIKES_SUSPEND) {
        userUpdates.isSuspended = true;
        userUpdates.suspendedAt = FieldValue.serverTimestamp();
        userUpdates.suspendReason = `Auto: ${next} strikes`;
      }
    }
    await userRef.update(userUpdates);
    const entRef = db.collection(COL.entertainers).doc(targetUid);
    const entSnap = await entRef.get();
    if (entSnap.exists) {
      const entUpdates: Record<string, unknown> = {
        strikes: next,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!skipAutoBanSuspend) {
        if (next >= STRIKES_BAN) {
          entUpdates.isBanned = true;
          entUpdates.bannedAt = FieldValue.serverTimestamp();
        } else if (next >= STRIKES_SUSPEND) {
          entUpdates.isSuspended = true;
          entUpdates.suspendedAt = FieldValue.serverTimestamp();
        }
      }
      await entRef.update(entUpdates);
    }
    await writeAdminLog(db, actorId, "issue_strike", targetUid, {
      reason,
      relatedBookingId: relatedBookingId ?? null,
      strikesAfter: next,
    });
    return { ok: true };
  }
);

// ---------- Phase 6: IAP receipt validation ----------

/** Callable: create Stripe Identity VerificationSession; returns client_secret for modal. (Used when verification provider is wired; manual upload flow uses submitManualVerificationCallable.) */
export const createVerificationSessionCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { role: "client" | "entertainer" } | null, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    const uid = context.auth.uid;
    const email = (context.auth.token?.email as string) ?? "";
    const role = data?.role ?? "client";
    if (role !== "client" && role !== "entertainer") {
      throw new functions.https.HttpsError("invalid-argument", "role must be client or entertainer");
    }
    try {
      return await createVerificationSession(uid, role, email, getStripe);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create verification session";
      throw new functions.https.HttpsError("internal", msg);
    }
  }
);

/** Callable: submit manual ID verification (front, optional back for driver's licence, selfie with ID). For testing until a verification provider is plugged in. */
export const submitManualVerificationCallable = functions.region("australia-southeast1").https.onCall(
  async (
    data: { idType: string; idFrontPath: string; idBackPath?: string; selfieWithIdPath: string; useDev?: boolean },
    context
  ) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    const uid = context.auth.uid;
    const { idType, idFrontPath, idBackPath, selfieWithIdPath, useDev } = data ?? {};
    if (!idType || typeof idFrontPath !== "string" || idFrontPath.trim() === "" ||
        typeof selfieWithIdPath !== "string" || selfieWithIdPath.trim() === "") {
      throw new functions.https.HttpsError("invalid-argument", "idType, idFrontPath, and selfieWithIdPath are required");
    }
    try {
      const db = getFirestore();
      const usersCol = useDev ? "users_dev" : COL.users;
      const userRef = db.collection(usersCol).doc(uid);
      const verificationPayload = {
        verification: {
          status: "verified",
          provider: "manual_upload",
          idType: idType.trim(),
          idFrontPath: idFrontPath.trim(),
          ...(idBackPath && idBackPath.trim() ? { idBackPath: idBackPath.trim() } : {}),
          selfieWithIdPath: selfieWithIdPath.trim(),
          verifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      };
      await userRef.set(verificationPayload, { merge: true });
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save verification";
      throw new functions.https.HttpsError("internal", msg);
    }
  }
);

/** Callable: validate Apple IAP receipt for verification fee; update user and record fee. */
export const verifyIAPReceiptCallable = functions.region("australia-southeast1").https.onCall(
  async (data: { receiptData: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    const uid = context.auth.uid;
    const receiptData = data?.receiptData;
    if (!receiptData || typeof receiptData !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "receiptData required");
    }
    let sharedSecret: string;
    try {
      sharedSecret = getAppleIAPSharedSecret();
    } catch {
      throw new functions.https.HttpsError("failed-precondition", "IAP verification not configured");
    }
    const result = await verifyAppleReceipt(receiptData, sharedSecret);
    if (!result.valid) {
      throw new functions.https.HttpsError("invalid-argument", result.error ?? "Invalid receipt");
    }
    if (result.productId !== IAP_PRODUCT_ID_VERIFICATION) {
      throw new functions.https.HttpsError("invalid-argument", "Receipt is not for verification fee product");
    }
    const db = getFirestore();
    const userRef = db.collection(COL.users).doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new functions.https.HttpsError("not-found", "User not found");
    const user = userSnap.data()!;
    if (user.verificationFeePaid === true) {
      return { ok: true, alreadyPaid: true };
    }
    const now = FieldValue.serverTimestamp();
    await userRef.update({
      verificationFeePaid: true,
      verifiedAt: now,
      iapReceipt: receiptData,
      updatedAt: now,
    });
    await db.collection(COL.fees).add({
      type: "signup_iap",
      userId: uid,
      bookingId: null,
      amountCents: VERIFICATION_FEE_CENTS,
      provider: "apple",
      referenceId: result.transactionId ?? "unknown",
      createdAt: now,
    });
    return { ok: true };
  }
);

// Webhook: Stripe sends payment_intent.succeeded etc. Requires raw body for signature verification.
const webhookHandler = getStripeWebhookHandler(getStripe);
export const stripeWebhook = functions
  .region("australia-southeast1")
  .runWith({ preserveRawBody: true } as Record<string, unknown>)
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    try {
      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from(req.body ?? "", "utf8");
      await webhookHandler({
        rawBody,
        body: req.body,
        headers: req.headers as Record<string, string>,
      });
      res.status(200).json({ received: true });
    } catch (e) {
      console.error("stripeWebhook error", e);
      res.status(400).send(`Webhook Error: ${(e as Error).message}`);
    }
  });
