# App Store Connect — Metadata Audit (Phase 7)

Use this checklist to ensure consistency between the app and App Store Connect before submission.

---

## App name

| Location | Value | Notes |
|----------|--------|------|
| **capacitor.config.json** | `appName: "Knockers"` | Bundle display name source. |
| **index.html** | `<title>Knockers</title>` | Web / in-app title. |
| **App Store Connect → Name** | **Knockers** | Must match; 30 chars max. |

**Action:** In App Store Connect, set **App Name** to **Knockers** (or your approved display name). Ensure it matches the app’s in-app title and config.

---

## Subtitle (optional)

- **App Store Connect → Subtitle:** 30 characters max. e.g. *“Book entertainers for your event”*.
- Keep tone professional and non-misleading.

---

## Description

- **App Store Connect → Description:** Full app description (4000 chars max).
- **Consistency:** Describe the marketplace (clients book entertainers), $2 verification (IAP), $30 booking fee, safety features (safety button, emergency contact, block/report), and that entertainers are independent contractors.
- **Avoid:** Promises of “guaranteed” outcomes; mention of external payment; anything that conflicts with Terms or Privacy.

**Suggested points to include:**
- Connect clients with entertainers for events.
- One-time verification fee via Apple In-App Purchase.
- $30 platform fee per booking (Stripe); transparent in app.
- Safety: in-app safety button, emergency contact, block.
- Terms, Privacy Policy, and Contractor Agreement linked in app.

---

## Keywords

- **App Store Connect → Keywords:** Comma-separated, 100 characters total, no spaces after commas.
- **Suggestions:** entertainment, booking, events, performers, marketplace, Australia (if applicable). Avoid competitor names and misleading terms.

---

## Privacy Policy URL

| Location | Value |
|----------|--------|
| **In-app** | Settings → Privacy → `/legal/privacy` (serves `public/legal/privacy-policy.md`). |
| **Production URL** | Must be a **public, live URL** (e.g. `https://yoursite.com/legal/privacy` or your hosted app’s `/legal/privacy`). |

**Action:** In App Store Connect → **App Privacy** → **Privacy Policy URL**, enter the **full URL** where your Privacy Policy is available (same content as in-app). Apple requires a link that works in a browser.

---

## Terms & Conditions

- Not required as a separate URL in App Store Connect, but must be **reachable in app** (Settings → Terms; signup links). Already implemented via `/legal/terms`.

---

## Screenshots

- **Required:** At least one screenshot per supported device size (e.g. 6.7", 6.5", 5.5" for iPhone).
- **Content:** Use real app screens (no placeholder text that says “Lorem” or “Test”). Show: Home/explore, booking flow, profile/settings, safety or payment disclosure if relevant.
- **Consistency:** No conflicting fee amounts or claims vs. in-app copy.

---

## Age rating

- Set according to your content (e.g. 18+ if adult content / entertainment). Align with in-app age gates and App Store questionnaire.

---

## In-App Purchases (IAP)

- **Product:** Verification fee (non-consumable), product ID must match backend `IAP_PRODUCT_ID_VERIFICATION` (see `functions` config).
- **App Store Connect:** Create the IAP product; ensure name and price match what users see in-app ($2 AUD or equivalent).

---

## Summary checklist

- [ ] App name matches in capacitor.config.json, index.html, and App Store Connect.
- [ ] Description reflects fees (IAP + $30), safety, and contractor model.
- [ ] Keywords under 100 chars; no misleading or competitor terms.
- [ ] Privacy Policy URL is a live, public URL with same content as in-app.
- [ ] Screenshots from real app; no test placeholders; consistent messaging.
- [ ] Age rating matches content and in-app gates.
- [ ] IAP product exists and matches backend product ID and in-app copy.

---

*Update this doc when you change app name, description, or policy URLs.*
