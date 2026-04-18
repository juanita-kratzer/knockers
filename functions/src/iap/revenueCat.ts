/**
 * Verify a user's "Knockers Pro" entitlement via RevenueCat REST API.
 * Called after a successful client-side purchase to sync Firestore.
 */

import * as https from "https";

const RC_API_BASE = "https://api.revenuecat.com/v1";
const ENTITLEMENT_ID = "Knockers Pro";

export interface RevenueCatEntitlementResult {
  entitled: boolean;
  error?: string;
}

/**
 * Check if a subscriber has the "Knockers Pro" entitlement via RevenueCat REST API.
 * @param appUserId - The RevenueCat app user ID (Firebase UID)
 * @param secretApiKey - RevenueCat secret (server-side) API key
 */
export async function checkRevenueCatEntitlement(
  appUserId: string,
  secretApiKey: string
): Promise<RevenueCatEntitlementResult> {
  const url = `${RC_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`;

  return new Promise((resolve) => {
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretApiKey}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            resolve({ entitled: false, error: `RevenueCat API ${res.statusCode}` });
            return;
          }
          const entitlements = parsed?.subscriber?.entitlements ?? {};
          const ent = entitlements[ENTITLEMENT_ID];
          if (ent && !ent.unsubscribe_detected_at && !ent.billing_issues_detected_at) {
            resolve({ entitled: true });
          } else {
            resolve({ entitled: false });
          }
        } catch {
          resolve({ entitled: false, error: "Failed to parse RevenueCat response" });
        }
      });
    });

    req.on("error", (err) => {
      resolve({ entitled: false, error: err.message });
    });

    req.end();
  });
}
