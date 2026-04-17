/**
 * Manual ID verification (upload front/back of ID + selfie with ID).
 * Used until a verification provider (e.g. Stripe Identity) is wired.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";

const REGION = "australia-southeast1";

function getFunctionsWithRegion() {
  return getFunctions(app, REGION);
}

/**
 * Submit manual verification after user has uploaded images to Storage.
 * @param {{ idType: string, idFrontPath: string, idBackPath?: string, selfieWithIdPath: string, useDev?: boolean }} payload
 */
export async function submitManualVerification(payload) {
  const fn = httpsCallable(getFunctionsWithRegion(), "submitManualVerificationCallable");
  const { data } = await fn(payload);
  return data;
}
