# Knockers — Full Post-Implementation Audit

**Date:** February 2025  
**Scope:** Build & runtime, Apple compliance, payments, safety, privacy, role/access, UX, store readiness.  
**Mode:** Analysis only — no code changes or refactors.

---

## A) Build Status

| Check | Result | Details |
|-------|--------|---------|
| **`npm run build`** | ✅ Pass | Exit code 0; production build succeeds. |
| **Build errors** | None | — |
| **Build warnings** | 2 (Vite chunking) | `useEntertainers.js` and `collections.js` are both statically and dynamically imported; dynamic imports do not move them to separate chunks. Cosmetic only. |
| **Dead code** | Not fully audited | No automated dead-code run; previous audit noted SafetyButton/ArrivalCodeEntry — **now wired** in `BookingStatus.jsx` and `Conversation.jsx`. |
| **Unused imports** | Not fully audited | No project-wide unused-import scan. |
| **Lazy routes** | ✅ Present | `App.jsx`: shared, talent, client, admin pages lazy-loaded; `Home` eager. |
| **Console in production** | ⚠️ Risk | Multiple `console.error` in catch blocks (e.g. `AuthContext.jsx`, `firebase.js`, `useMessages.js`, `useBookings.js`, `SafetyButton.jsx`); `console.log`/`console.warn` for demo mode, auth timeout, referral, adminLog `[AdminLog]`, geolocation. **Recommend:** Strip or gate behind `import.meta.env.DEV` for store builds. |

**Summary:** Build is stable. Reduce or remove console usage in production to avoid noise and avoid signalling debug/test code to Apple.

---

## B) Compliance Risks

| Area | Finding | Location / Notes |
|------|---------|------------------|
| **External payment links** | ✅ None found | Grep for external payment / “pay outside” found only **prohibitive** copy: `VerificationFeePage.jsx` (“Do not pay outside the app”), `Terms.jsx` (“Do not arrange payments outside the platform”). |
| **Stripe for digital unlocks** | ✅ Compliant | Digital unlock (messaging, bookings, listings) gated by **Apple IAP** verification fee ($2). Stripe used only for **real-world** booking deposits + $30 platform fee. `src/lib/policies.js`, `VerificationFeePage.jsx`, `canUsePaidFeatures` in `verificationFee.js`. |
| **Off-platform payment mentions** | ✅ Prohibited in copy | Terms and Verification page explicitly forbid off-platform payments. |
| **IAP validation** | ✅ Implemented | `verifyIAPReceiptCallable` (functions); `verifyAppleReceipt` in `functions/src/iap/apple.ts`; `APPLE_IAP_SHARED_SECRET` required in config. Receipt validated server-side; user `verificationFeePaid` and `fees` record written on success. |
| **Adult/sexual content** | ⚠️ Policy only | Adult content gated by `isAdultContent` + 18+ age gate (`RoleContext.verifyAge`, `TalentPublic.jsx`, `BookingRequest.jsx`, `ExplorePage.jsx`). Age is **self-declared** (`ageVerified` set by user action). No automated content or image checks. **Needs confirmation:** Satisfactory for App Store and local law. |
| **Moderation tools** | ✅ Present | Admin: ban/suspend/unban (`useAdminUsers.js`, Admin Users/Entertainers); strikes; dispute resolve (`AdminDisputes.jsx`, `adminResolveDispute`). |
| **UGC safety** | ✅ Partial | Contact-info blocking: `contentModeration.js` used in **CreateListing** (notes), **EditProfile** (bio), **useMessages** (chat). Booking notes in `BookingRequest.jsx` use `sanitizeOrReject`. **Gap:** If `ALLOW_CONTACT_INFO_AFTER_DEPOSIT` is true, contact info is allowed in chat after deposit (`policies.js:40`). |
| **Reporting / blocking** | ⚠️ Block only | **Block:** Settings → Blocked (entertainers/clients); `BlockedEntertainersPage`, `BlockedClientsPage`. **Report:** No dedicated “Report user” flow found; disputes are for **ratings** (Admin Disputes). **Needs confirmation:** Whether in-app “Report user” (e.g. for abuse/safety) is required for App Store. |
| **Age gating** | ✅ Present | 18+ gates on adult profiles and booking request; `ageVerified` stored in user; `ProtectedRoute` can require age verification. |
| **Consent records** | ✅ Present | Signup writes `legalAcceptedAt`, `termsVersion` (`AuthContext.jsx`, client/talent Signup). Stored in Firestore user doc. |

**Summary:** IAP for digital unlock and Stripe for real-world services are correctly split. Main compliance uncertainties: (1) legal docs still marked “DRAFT” (see Privacy), (2) no dedicated “Report user” flow, (3) adult content and age verification level.

---

## C) Payment Risks

| Check | Result | Details |
|-------|--------|---------|
| **$2 signup/verification fee** | ✅ IAP | Handled via Apple IAP; product id in `config` (`IAP_PRODUCT_ID_VERIFICATION`); `verifyIAPReceiptCallable` validates receipt and sets `verificationFeePaid`, writes to `fees`. Waivable by admin (`verificationFeeWaivedBy`). |
| **$30 booking fee** | ✅ Transparent | Shown in UI: `VerificationFeePage.jsx`, `ReceiptsPage.jsx`, `BookingStatus.jsx`, `AcceptBooking.jsx`, `FAQ.jsx`, `Terms.jsx`, `policies.js` (`PLATFORM_FEE_DOLLARS`). Backend uses 3000 cents in deposit PaymentIntent. |
| **Refund flows** | ✅ Admin | `adminRefundBookingCallable`; Admin Bookings UI calls `adminRefundBooking(bookingId, refundType, reason)`. Full/partial/deposit refund types. |
| **Receipts** | ✅ | Verification: Receipts page + “Receipt is stored with your account”. Booking: Stripe email receipt; copy states “Platform fee: $30 per booking”. |
| **Apple circumvention** | ✅ None | No Stripe or other payment for digital unlocks; only IAP for verification fee. |

**Summary:** Payments are consistent with policy; $2 IAP and $30 Stripe fee are implemented and disclosed. No circumvention of Apple IAP for in-app digital goods.

---

## D) Safety Gaps

| Item | Status | Location / Notes |
|------|--------|------------------|
| **Safety button** | ✅ Wired | `SafetyButton.jsx` used in `BookingStatus.jsx` and `Conversation.jsx` for entertainer when booking is DEPOSIT_PAID or IN_PROGRESS. `triggerSafetyAlert` in `useBookings.js`. |
| **Emergency contact** | ✅ | `EmergencyContactPage.jsx`; SafetyButton shows modal if `!hasEmergencyContact` and directs user to set emergency contact in Settings. |
| **Block** | ✅ | Blocked lists in Settings; blocked pages and logic present. |
| **Report** | ⚠️ Rating disputes only | Disputes are for **ratings** (Admin Disputes). No generic “Report user” or “Report conversation” flow. |
| **Admin intervention** | ✅ | Ban, suspend, unban, strikes, refund, freeze booking, resolve dispute, adjust balance, waive verification. |
| **Bans enforced** | ✅ | `Layout.jsx`: `isBanned && !isAdmin` → `BannedPage`. `useMessages.js`: banned users cannot send messages. `AcceptBooking.jsx`: banned/suspended cannot accept. Firestore rules: role/admin-only fields not user-writable. |
| **Chat filtering** | ✅ | `useMessages.js` uses `sanitizeOrReject(message)` unless `ALLOW_CONTACT_INFO_AFTER_DEPOSIT` and messageable status. |
| **Review disputes** | ✅ | Admin Disputes page; `adminResolveDispute`; uphold/dismiss/modify. |

**Summary:** Safety button and emergency contact are in place; bans are enforced in layout, messaging, and accept-booking. Only notable gap: no general “Report user” or “Report chat” path (only rating disputes).

---

## E) Privacy Gaps

| Item | Status | Location / Notes |
|------|--------|------------------|
| **Privacy Policy reachable** | ✅ | Settings → “Privacy” → `/legal/privacy`; Footer links to `/legal/terms`, `/legal/privacy`. `LegalDoc.jsx` serves `public/legal/privacy-policy-draft.md`. |
| **T&C reachable** | ✅ | Settings → “Terms” → `/legal/terms`; signup and footer link to terms. |
| **Consent stored** | ✅ | `legalAcceptedAt`, `termsVersion` on user doc. |
| **Data retention** | ⚠️ Documented only | Legal docs in `public/legal/` are **drafts**. No in-code retention or auto-deletion. **Needs confirmation:** Final privacy policy and retention in lawyer-approved docs. |
| **Chat access rules** | ✅ | Firestore: `bookings/{id}/messages` readable/writable only by booking participants (client/entertainer). |
| **Location handling** | ✅ | Safety alert captures location with user action; used for emergency contact notification. |

**Critical for store:** `LegalDoc.jsx` shows a **“DRAFT — For lawyer review. Not yet legally binding”** badge for all legal docs (`/legal/terms`, `/legal/privacy`, `/legal/contractor`). **App Store risk:** Reviewers may reject if legal documents are not final and binding. **Required:** Replace with lawyer-approved, binding versions and remove or change the draft badge before submission.

---

## F) UX Issues

| Item | Finding |
|------|--------|
| **Disclaimers** | Terms, privacy, and contractor links present at signup and in Settings/Footer. |
| **Fee transparency** | $2 verification (IAP) and $30 booking fee stated in Verification page, Receipts, BookingStatus, AcceptBooking, FAQ, Terms. |
| **Misleading copy** | None identified; fee and cancellation wording is consistent. |
| **Dark patterns** | None identified. |
| **Cancellation terms** | FAQ and Terms describe 72h window, $80 outside-window fee, $30 entertainer cancellation fee, non-refundable platform fee. |

**Optional:** Ensure Booking History for entertainers (e.g. Settings → Booking History) shows entertainer bookings when in entertainer role; previous audit noted this route could show client dashboard — verify in current build.

---

## G) Apple Review Risks (Red / Amber / Green)

### 🔴 Red (likely rejection or hard scrutiny)

1. **Legal documents marked DRAFT**  
   **Where:** `src/pages/shared/LegalDoc.jsx` (DraftBadge); documents in `public/legal/*-draft.md`.  
   **Risk:** “Not yet legally binding” is a direct signal to reviewers that terms/privacy are not final.  
   **Action:** Finalise with lawyer; remove draft badge and use final docs.

2. **Test account credentials in repo**  
   **Where:** `docs/TEST_ACCOUNTS.md`: email `apple-review@knockers.app`, password `KnockersTest2025!App1e`.  
   **Risk:** If this file is shipped or visible, Apple may consider it a backdoor or test-only path.  
   **Action:** Do not ship TEST_ACCOUNTS.md in app bundle; provide test credentials only via App Store Connect notes; consider `.cursorignore`/`.gitignore` or moving to private runbook.

### 🟠 Amber (possible questions or rejection)

3. **Console usage in production**  
   **Where:** Multiple `console.error`/`console.log`/`console.warn` in `src` (auth, firebase, hooks, SafetyButton, etc.).  
   **Risk:** Suggests debug or unfinished app.  
   **Action:** Remove or gate behind `import.meta.env.DEV` for production builds.

4. **No in-app “Report user”**  
   **Risk:** Guidelines expect ways to report abuse/harassment; currently only block and rating disputes exist.  
   **Action:** Confirm guideline requirement; add “Report user” flow if needed.

5. **Favicon / app icon**  
   **Where:** `index.html` references `/logo.png`; `public/` does not list `logo.png` (only `vite.svg`, legal, suburb data).  
   **Risk:** Missing icon can 404 or look unpolished.  
   **Action:** Add `public/logo.png` and ensure iOS asset catalog has required icon sizes for store.

6. **Test account bootstrap in production**  
   **Where:** `bootstrapTestAccountCallable` restricted to `TEST_ACCOUNT_EMAIL` (default `apple-review@knockers.app`).  
   **Risk:** Reviewer may see “test account” as a special path.  
   **Mitigation:** Intent is Apple review; keep callable restricted to one email and document in review notes. Consider renaming or documenting clearly so it’s obvious it’s for review only.

### 🟢 Green (aligned with guidelines)

7. **IAP for digital unlock** — Verification fee via Apple IAP; receipt validation on backend.  
8. **Stripe only for real-world services** — Deposits and platform fee for bookings.  
9. **No external payment links** — Copy forbids off-platform payments.  
10. **Safety and moderation** — Safety button, emergency contact, block, admin tools, bans enforced.  
11. **Age gating** — 18+ for adult content.  
12. **Privacy & T&C** — Reachable in app; consent stored; draft status is the only blocker.

---

## H) Required Fixes (Prioritised)

1. **Legal docs (P0)**  
   - Replace draft legal documents with lawyer-approved, binding versions.  
   - Remove or reword the “DRAFT — For lawyer review. Not yet legally binding” badge in `LegalDoc.jsx` (e.g. remove for production or show only when doc slug contains “draft”).

2. **Test credentials (P0)**  
   - Ensure `docs/TEST_ACCOUNTS.md` (or any file with real test password) is not in the app bundle or public repo if that’s the ship path.  
   - Provide Apple test account details only via App Store Connect.

3. **App icon / favicon (P0)**  
   - Add `public/logo.png` (or update `index.html` to an existing asset).  
   - Confirm iOS app icon set in Xcode/Capacitor has all required sizes for App Store.

4. **Console in production (P1)**  
   - Strip or gate `console.*` in production (e.g. build step or `import.meta.env.DEV`).

5. **“Report user” (P1 – if required)**  
   - Confirm App Store requirement for reporting users (not just ratings).  
   - If required, add a “Report user” flow (e.g. from profile or conversation) and route to admin/support.

6. **Adult content & age (P2)**  
   - Confirm with legal that self-declared 18+ and current age gates are sufficient for App Store and jurisdiction.

---

## I) Nice-to-Haves

- **Vite chunking:** Resolve dual static/dynamic import for `useEntertainers.js` and `collections.js` to clean warnings.  
- **Booking History:** Double-check that when an entertainer opens “Booking History” from Settings, they see entertainer bookings (not client dashboard).  
- **Contact info after deposit:** Review `ALLOW_CONTACT_INFO_AFTER_DEPOSIT` (currently `true`) with safety/compliance; consider keeping chat fully filtered if policy prefers no contact info in app.  
- **Data retention:** Document or implement retention (e.g. message expiry) per final privacy policy.  
- **Finances rule:** Firestore `match /finances/{odcId}` uses `resource.data.ownerId` (correct); variable name `odcId` is cosmetic; no change required unless renaming for clarity.

---

**End of audit.** All findings are from static analysis and code paths; production behaviour depends on config, env, and deployment. Where marked “Needs confirmation,” validate with product, legal, and App Store requirements before submission.
