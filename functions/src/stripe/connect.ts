/**
 * Stripe Connect Express: create account and onboarding link for entertainers.
 */

import { getStripe, COL } from "../lib/config";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function createConnectAccount(entertainerId: string, email: string): Promise<{ accountId: string; onboardingUrl: string }> {
  const db = getFirestore();

  const entertainerRef = db.collection(COL.entertainers).doc(entertainerId);
  const entSnap = await entertainerRef.get();
  if (!entSnap.exists) {
    throw new Error("Entertainer not found");
  }
  const data = entSnap.data()!;
  if (data?.stripe?.connectAccountId) {
    // Already have account; return fresh link instead
    return getConnectOnboardingLink(entertainerId);
  }

  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: "express",
    country: "AU",
    email: email || undefined,
    metadata: { entertainerId },
  });

  await entertainerRef.update({
    "stripe.connectAccountId": account.id,
    "stripe.onboardingStatus": "PENDING",
    "stripe.chargesEnabled": false,
    "stripe.payoutsEnabled": false,
    "stripe.detailsSubmitted": false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.APP_URL || "https://app.knockers.com"}/finances?refresh=1`,
    return_url: `${process.env.APP_URL || "https://app.knockers.com"}/finances?success=1`,
    type: "account_onboarding",
  });

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  };
}

export async function getConnectOnboardingLink(entertainerId: string): Promise<{ accountId: string; onboardingUrl: string }> {
  const db = getFirestore();
  const entertainerRef = db.collection(COL.entertainers).doc(entertainerId);
  const entSnap = await entertainerRef.get();
  if (!entSnap.exists) throw new Error("Entertainer not found");
  const data = entSnap.data()!;
  const accountId = data?.stripe?.connectAccountId;
  if (!accountId) {
    return createConnectAccount(entertainerId, data?.email ?? "");
  }

  const stripe = getStripe();
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.APP_URL || "https://app.knockers.com"}/finances?refresh=1`,
    return_url: `${process.env.APP_URL || "https://app.knockers.com"}/finances?success=1`,
    type: "account_onboarding",
  });

  return {
    accountId,
    onboardingUrl: accountLink.url,
  };
}

/**
 * Sync Connect account status from Stripe (call from webhook account.updated or on demand).
 */
export async function syncConnectAccountStatus(accountId: string): Promise<void> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  const db = getFirestore();
  const q = await db.collection(COL.entertainers).where("stripe.connectAccountId", "==", accountId).limit(1).get();
  if (q.empty) return;
  const ref = q.docs[0].ref;
  const detailsSubmitted = account.details_submitted ?? false;
  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  const onboardingStatus = detailsSubmitted && chargesEnabled ? "COMPLETE" : detailsSubmitted ? "PENDING" : "PENDING";
  await ref.update({
    "stripe.onboardingStatus": onboardingStatus,
    "stripe.chargesEnabled": chargesEnabled,
    "stripe.payoutsEnabled": payoutsEnabled,
    "stripe.detailsSubmitted": detailsSubmitted,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
