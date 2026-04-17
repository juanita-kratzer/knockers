# Knockers — Project Memory

**Purpose:** Resume the project after session loss. Keep this file updated as phases complete.

---

## Project overview

**Knockers** is a two-sided **entertainer marketplace**: clients book entertainers; entertainers get paid via escrow. Target: a legally safe, trust-based product with escrow, ratings, safety, and compliance—not a prototype.

- **Clients:** Browse, request/book entertainers, pay deposit + platform fee, message after deposit paid, cancel (with fee rules).
- **Entertainers / vendors:** Performers and people who hire out equipment (e.g. fairy floss machine, jumping castle, popcorn machine, photo booth). Same signup and booking flow; they select categories including “Equipment & Event Hire” if applicable. Accept/decline requests, set deposit, Stripe Connect, payouts, listings.

---

## Technical stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 7, React Router 7, styled-components, Lucide icons |
| Auth & data | Firebase Auth, Firestore |
| Storage | Firebase Storage |
| Backend | Firebase Cloud Functions (Node 18+, TypeScript), region `australia-southeast1` |
| Payments | Stripe (Connect Express, PaymentIntents, Transfers, webhooks) |
| Maps | Google Maps API, Australian suburbs + boundaries |
| Mobile | Capacitor (iOS present; web-first until PM approves native) |

Collections use `_dev` suffix in development (Firestore + app); functions use `FUNCTIONS_EMULATOR` / `NODE_ENV` to match.

---

## Implemented phases

| Phase | Scope | Status | Notes |
|-------|--------|--------|--------|
| **Pre–Phase 1** | Auth, roles, profiles, bookings flow, listings, chat, ratings UI, safety button, arrival codes, company codes, suburb/map, Finances/Activity dashboards | ✅ Done | No dates in repo; core product before payments |
| **Phase 1 — Payments & Trust** | Stripe Connect, deposit escrow, webhooks, payout on completion, cancellation fees, Firestore payment protections, feature flag | ✅ Code complete | Awaiting Stripe setup + deploy + test |

---

## Current phase and resume point

- **Phase:** Phase 1 (Payments & Trust) + full codebase audit fixes + Profile/Settings restructure + Verification & Badges.
- **Resume point:** 12-issue UI/UX audit complete + follow-up fixes (see sections below). **Firestore rules deployed** to `knockers-c5e30` (role switching, entertainer CREATE relaxed, `/usernames` collection). Company affiliation feature removed from entire app (signup, edit profile, public profile, finances, bookings). Profile save + entertainer signup permissions issues fixed. Backend callable `submitPoliceCheckCallable` **not yet implemented** — frontend is wired and ready. Next step is **Stripe wiring + deploy + test** and **implementing `submitPoliceCheckCallable`** in Cloud Functions.
- **Definition of done for Phase 1:** Full path passes in test: Connect onboarding → deposit payment → webhook confirms → completion → payout → cancel (with fee/refund behaviour).

Do **not** start Phase 2 until Phase 1 is validated.

---

## What is built

- **Auth & roles:** Email/password signup, client/talent roles, choose-dashboard for dual-role users, profile type (soft/hard), police check flow. Username collected at signup (both client and talent), stored lowercase, unique via `/usernames/{username}` Firestore collection. `dateOfBirth` field added to signup + edit profile.
- **Bookings:** Request → accept with deposit → deposit deadline (10 min) → statuses: REQUESTED, ACCEPTED, DEPOSIT_PENDING, DEPOSIT_PAID, IN_PROGRESS, COMPLETED, CANCELLED, EXPIRED, DECLINED. Client/talent dashboards, booking detail page, arrival code.
- **Listings:** Clients post listings; entertainers apply; client accepts → booking. Firestore rules + indexes for `listings` / `listingApplications`.
- **Chat (Inbox):** Messaging gated on booking (when Stripe off: ACCEPTED; when Stripe on: DEPOSIT_PAID). Conversation UI, real-time messages.
- **Stripe (Phase 1, behind flag):**
  - **Connect:** `createConnectAccount`, `getConnectOnboardingLink` callables; entertainer `stripe` fields on `entertainers`; “Set up payouts” on Finances.
  - **Deposit:** `createDepositPaymentIntent(bookingId)` callable; client pays deposit + $30 via PaymentElement; webhook `payment_intent.succeeded` sets DEPOSIT_PAID; no clientSecret stored.
  - **Payout:** `releasePayoutOnCompletion(bookingId)` callable; Transfer to Connect account on completion; talent Dashboard calls it after `completeBooking` when flag on.
  - **Cancel:** `cancelBookingWithFees(bookingId, cancelledBy)` callable; client >72h $80 fee (refund rest), <72h full; entertainer cancel = full refund + strike (no charge to entertainer in Phase 1). Client Dashboard uses it when flag on.
- **Firestore:** Rules block client writes to `paymentStatus`, `stripe`, `payout`, `cancellation` on bookings and `stripe` on entertainers. Read allowed for own booking/entertainer doc.
- **Feature flag:** `VITE_STRIPE_ENABLED`; when false, existing mock flow and no Stripe UI.

---

## What is not built yet

- **Phase 1:** Stripe keys, webhook registration, deploy, and full test run (onboarding → deposit → webhook → payout → cancel).
- **Phase 2 — Cancellation enforcement & strikes:** Strike system, repeated-cancel detection, auto restrictions, manual billing prep, admin hooks.
- **Phase 3 — Reviews & reputation:** Mutual ratings, delayed reveal, entertainer-only reviews, dispute workflow.
- **Phase 4 — Safety & communications:** Twilio panic SMS, live GPS, FCM, chat moderation, auto-delete.
- **Phase 5 — Auth & verification:** SMS OTP, re-auth before payment, Face ID, Stripe Identity / Veriff. **ID verification (document scan), police check flow, and SMS verification are not wired:** placeholders and copy exist; see “Identity & verification: what’s built vs what you need to plug in” in this doc for what you must provide (provider choice, keys, URLs) before implementation.
- **Phase 6 — Legal & policies:** Full + short T&Cs, contractor agreement, privacy, refund, anti-poaching.
- **Optional (Phase 1):** `payments` audit collection; `account.updated` webhook to sync Connect status.

---

## Roadmap (remaining)

1. **Phase 1** — Validate (Stripe setup → deploy → test). **Current.**
2. **Phase 2** — Cancellation enforcement & strikes (blocked until Phase 1 passes).
3. **Phase 3** — Reviews & reputation.
4. **Phase 4** — Safety & communications.
5. **Phase 5** — Auth & verification.
6. **Phase 6** — Legal & policies.

---

## Current blockers and dependencies

- **Phase 1 completion:** Needs Stripe test keys, webhook secret, env set, functions + rules deployed, webhook URL registered. Phase 1 is not “done” until the full payment path is green in test.
- **Phase 2:** Blocked on Phase 1 validated.
- **Webhook:** Stripe signature verification needs raw request body; `preserveRawBody` in functions; if unavailable in prod, use Stripe CLI forwarding or a host that preserves raw body.

---

## Environment variables

### Frontend (Vite; `.env` or hosting env)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase config |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase config |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase config |
| `VITE_STRIPE_ENABLED` | For Phase 1 payments | `true` to enable Stripe UI + callables |
| `VITE_STRIPE_PUBLISHABLE_KEY` | When Stripe on | `pk_test_...` for PaymentElement |
| `VITE_GOOGLE_MAPS_API_KEY` | For maps | Google Maps API key |

### Cloud Functions (Firebase config or `functions/.env` for emulator)

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | For Phase 1 | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | For Phase 1 webhook | `whsec_...` (after creating webhook) |
| `STRIPE_ENABLED` | Optional | `true` |
| `APP_URL` | For Connect links | e.g. `https://yourapp.web.app` |

Dev: functions use `_dev` collections when `FUNCTIONS_EMULATOR=true` or `NODE_ENV=development`.

### Firebase / Google Cloud (auth)

| Use | Value |
|-----|--------|
| **Android OAuth client (phone verification)** | `494027284819-24d5vs3g18eb02mn9tq642afnm4md931.apps.googleusercontent.com` |

Configure in **Google Cloud Console** → APIs & Services → Credentials (Android client) and in **Firebase Console** → Project settings → Your apps → Android → when enabling Phone sign-in. Used for Firebase Phone Auth (Phase 5).

---

## Deployment checklist

1. **Stripe (test):** Create/link account, enable Connect, get Secret + Publishable keys. Create webhook endpoint (see below), get Signing secret.
2. **Functions config:** Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optionally `APP_URL` (Firebase config or `functions/.env` for emulator).
3. **Build & deploy functions:**  
   `cd functions && npm run build && cd .. && firebase deploy --only functions`
4. **Deploy rules:**  
   `firebase deploy --only firestore:rules`
5. **Webhook:** In Stripe Dashboard add endpoint URL: `https://australia-southeast1-<project>.cloudfunctions.net/stripeWebhook` (replace `<project>` with Firebase project ID, e.g. `knockers-c5e30`). Events: `payment_intent.succeeded` (and optionally `payment_intent.payment_failed`). Set `STRIPE_WEBHOOK_SECRET` to the signing secret.
6. **Frontend:** Set `VITE_STRIPE_ENABLED=true` and `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`, then rebuild. Deploy hosting as usual (e.g. `firebase deploy --only hosting` or your CI).

---

## Testing checklist (Phase 1)

- [ ] **Connect onboarding:** As entertainer, open Finances → “Set up payouts” → complete Stripe Express onboarding (test data).
- [ ] **Deposit:** As client, booking in DEPOSIT_PENDING → agree rules + cancellation → “Continue to payment” → pay with test card (e.g. 4242…) → see “Payment processing…” → booking becomes DEPOSIT_PAID, chat unlocks.
- [ ] **Webhook:** Confirm `payment_intent.succeeded` is received and booking updates (check Firestore or UI).
- [ ] **Payout:** As entertainer, mark booking COMPLETED → confirm no error and payout is sent (Stripe Dashboard or booking doc has `stripe.transferId`).
- [ ] **Cancel:** As client, cancel before deposit paid (no charge); cancel after deposit paid >72h (refund minus $80); cancel <72h (no refund). As entertainer, cancel (full refund + strike recorded; no charge to entertainer).

---

## How the $30 booking fee works (already implemented)

- **When:** The client pays **deposit + $30** in a **single** charge at “Pay deposit” (Stripe PaymentIntent). No separate charge for the fee.
- **Where the $30 goes:** The charge is on the **platform’s** Stripe account. On completion, we **Transfer** only the **deposit** (in cents) to the entertainer’s Connect account. The platform **keeps the $30** because we never transfer it.
- **Code:** `functions/src/lib/config.ts` → `PLATFORM_FEE_CENTS = 3000`. `createDepositPaymentIntent` charges `depositCents + PLATFORM_FEE_CENTS`. `releasePayoutOnCompletion` transfers only `amountDepositCents` (deposit only). So the $30 stays in the platform Stripe balance.
- **Changing the fee:** Edit `PLATFORM_FEE_CENTS` in `functions/src/lib/config.ts` and redeploy functions. Frontend display of “+ $30 platform fee” is in `BookingStatus.jsx` and `useBookings.js` (`PLATFORM_FEE = 30`); keep in sync if you change it.

---

## What you need to provide (to complete the app)

### Required for Phase 1 (payments to work)

| What | Where to set it | Example / format |
|------|------------------|-------------------|
| **Stripe Secret key** | Firebase Functions config or `functions/.env` | `STRIPE_SECRET_KEY=sk_test_...` |
| **Stripe Publishable key** | App `.env` or hosting env | `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` |
| **Stripe Webhook signing secret** | After creating webhook in Stripe Dashboard | `STRIPE_WEBHOOK_SECRET=whsec_...` |
| **App URL** (for Connect redirect/refresh) | Functions config or `functions/.env` | `APP_URL=https://yourapp.web.app` |

### Already in repo / no action

- Firebase project config (API key, project ID, etc.) — already in `.env`.
- Google Maps API key — already referenced.
- Android OAuth client ID for phone verification — recorded in this file (Phase 5).

### Optional (you only need to decide)

- **Stripe live keys:** When going live, replace test keys with live (`sk_live_...`, `pk_live_...`) and create a **live** webhook; set env in production.
- **Fee amount:** $30 is hardcoded (3000 cents). To change, update `PLATFORM_FEE_CENTS` in functions and `PLATFORM_FEE` in frontend.

---

## What is still to hook up

| Item | Status | Action |
|------|--------|--------|
| **Stripe keys + webhook** | Not set | Add keys and webhook URL; set env vars (see above and Deployment checklist). |
| **Deploy Cloud Functions** | Not run | `cd functions && npm run build && cd .. && firebase deploy --only functions`. |
| **Deploy Firestore rules** | ✅ Done | Deployed with role-switching, entertainer CREATE relaxed, `/usernames` rules. |
| **Frontend Stripe env** | Off by default | Set `VITE_STRIPE_ENABLED=true` and `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` then rebuild. |
| **Full payment test** | Not done | Run through: Connect onboarding → deposit → webhook → complete → payout → cancel (see Testing checklist). |
| **Route /settings/bank** | Link exists, no dedicated page | Settings and Finances link to “Update payout account” / “bank”. Payout setup is Stripe Connect via Finances → “Set up payouts”. Optional: add a `/settings/bank` route that redirects to `/finances` for entertainers, or remove the link. |
| **Payments audit collection** | Optional | Not implemented; can add writes to `payments` in functions for audit. |
| **Connect status sync** | Optional | `account.updated` webhook not added; entertainer `stripe.*` can be synced via dashboard or future webhook. |

Nothing else is required for the app to function end-to-end once Stripe is wired and deployed.

---

## Identity & verification: what’s built vs what you need to plug in

The app **promises** ID verification, police check, and secure phone use, but **no verification provider is wired up yet**. Below is what exists, how it’s supposed to work, and **what you need to give me** so we can plug each in.

---

### 1. ID verification (document scan, betting‑style)

**How it’s supposed to work:** User proves identity (and 18+) by scanning/uploading a government ID (e.g. driver’s licence, passport). A provider checks the document and optionally face match; we get a result and mark the user “ID verified”.

**What’s in the app today:**
- Signup has a “Verify Your Identity” step: user picks **ID type** (dropdown); copy says “You will be asked to upload your ID after signup.”
- **No** post-signup ID upload flow.
- **No** integration with any ID verification provider.
- Storage path exists: `users/{uid}/verification/` (for future uploads); not used.
- `idType` is saved on the user doc; nothing reads it for verification.

**Provider chosen: Stripe Identity.** Verification links look like `https://verify.stripe.com/start/live_...` (live mode; session-specific, valid ~48 hours). We do **not** hardcode that URL—we create a **VerificationSession** per user via the Stripe API and redirect the user to the session URL Stripe returns. See [Stripe Identity](https://verify.stripe.com/).

**What you’ve provided:** Stripe Identity is enabled (live); you have a valid 48h link for testing. For production we use the API.

**Still to decide:** When to trigger (before first booking / before deposit / after signup / optional in Profile) and what “verified” gates (badge, allow booking, gate payments).

**What I’ll implement:** (1) Cloud Function to create a Stripe Identity **VerificationSession** (type `document` or `id_number`, with `return_url` back to the app). (2) Frontend: “Verify identity” button → call function → redirect user to `session.url`. (3) Webhook handler for `identity.verification_session.verified`: look up user by session metadata, set `idVerified: true` and `idVerifiedAt` on user doc. (4) Same webhook endpoint as payments; add event `identity.verification_session.verified` in Stripe Dashboard. Uses existing **STRIPE_SECRET_KEY**; no extra keys. Ensure **Identity** is enabled in Stripe Dashboard (Settings → Identity).

**Event shape (for implementation):** When creating the session via API, set **metadata** (e.g. `metadata: { userId: uid }`) so the `verified` webhook knows which user to update. Stripe sends `identity.verification_session.created` (status `requires_input`, `url` for redirect) and later `identity.verification_session.verified`; the payload includes `id`, `metadata`, `url`, `client_secret`. Only handle `identity.verification_session.verified` to set `idVerified`; `created` can be logged or ignored.

---

### 2. Police check (user-purchased, upload & review)

**How it’s supposed to work:** User is directed to complete a police check (e.g. Australian national or state). Once they have it, they upload the result or we get a callback from a provider; we mark profile as “Hard” (police check done).

**What’s in the app today:**
- **Soft vs Hard profile:** “Soft” = ID only; “Hard” = police check verified. Stored as `profileType` on user/entertainer.
- **Police check page:** `/settings/police-check` is a **placeholder**: “Police check coming soon. You’ll be able to complete a police check here to upgrade your profile from soft to hard.”
- Profile has “Get police check” → links to that placeholder. No real provider, no upload, no API.

**Decision: National Crime Check (integrated).** You have contacted National Crime Check re getting an API key. Once you have the key and API/docs, we can wire the integrated flow + webhook and set `profileType: 'hard'` when they confirm.

**What you still need to provide:** API key, API docs or endpoint details (e.g. how to initiate a check, webhook/callback for result).

**What I’ll do once you have it:** Replace the `/settings/police-check` placeholder with National Crime Check integration: initiate check (or redirect to their hosted flow), handle webhook/callback, set `profileType: 'hard'` and store result reference when confirmed.

---

### 3. Mobile SMS verification

**Decision: Firebase SMS verification (Firebase Phone Auth).** You want to use Firebase for SMS verification. No extra SMS provider keys; use the existing Android OAuth client and enable Phone in Firebase Console.

**How it’s supposed to work:** User enters phone number; we send an SMS code via Firebase; they enter it; we mark the number as verified. Used for account security, recovery, or as a second factor.

**What’s in the app today:**
- **Phone is collected** at signup (client and talent) and stored on the user doc (`phone`). It’s **not** verified by SMS.
- **Firebase Phone Auth:** Android OAuth client is recorded in this doc. Firebase can send SMS OTPs; the app does **not** use Phone Auth yet (sign-in is email/password only, no “Verify phone” step).

**What you need to do:** Enable **Phone** in Firebase Console → Authentication → Sign-in method. (Optional: decide whether you also want phone sign-in, or only “verify phone” after signup / in settings.)

**What I’ll implement:** “Verify phone” flow (after signup or in settings): send code via Firebase Phone Auth, user enters code, then set `phoneVerified: true` (and optionally link `phoneNumber` to Auth). reCAPTCHA will be used per Firebase’s web flow. Optionally add phone sign-in if you want it.

---

### Summary: verification decisions and next steps

| Area | Decision / status | Next step |
|------|-------------------|-----------|
| **ID verification** | **Stripe Identity** (documented; create VerificationSession via API, webhook sets `idVerified`). | Implement when you’re ready (trigger point + gates). |
| **Police check** | **National Crime Check** (integrated). You’ve contacted them re API key. | You provide API key + docs; then we wire flow + webhook, set `profileType: 'hard'`. |
| **SMS verification** | **Firebase Phone Auth.** You want Firebase SMS verification. | You enable Phone in Firebase Console; we add “Verify phone” flow and set `phoneVerified`. |

None of these are optional from a product perspective—the app copy and profile types already promise them. ID and SMS can be implemented as soon as you’re ready (Stripe Identity uses existing Stripe key; Firebase Phone needs Phone sign-in method enabled). Police check is blocked on National Crime Check API key + docs.

---

## Test account (Apple review / full QA)

Full-access test account (client + entertainer) so Apple reviewers and you can switch between client and entertainer dashboards and test everything.

| What      | Value |
|-----------|--------|
| **Email** | Set in Firebase Auth; set `TEST_ACCOUNT_EMAIL` in Functions config to match (e.g. `apple-review@knockers.app`). |
| **Password** | Set in Firebase Auth. Do not commit. Provide to Apple via App Store Connect → App Review Information. |

**Setup (test account should already have both profiles):**
1. Create the user in Firebase Console (Authentication → Add user) if not already.
2. Log in once in the app as that user.
3. Go to **Settings** → in the Account section you’ll see **“Setup full test account”** with a **Run** button (only visible when logged in as the test account email). Tap **Run** so the backend creates the entertainer profile and sets the user as client with both profiles.
4. Page reloads; you can then use **Profile** → “Switch to Entertainer Dashboard” / “Switch to Client Dashboard” and test all flows.

The Cloud Function **bootstrapTestAccountCallable** (only callable by the test account email) creates/updates the user doc with `role: "client"` and `hasEntertainerProfile: true`, and creates a minimal entertainer doc so the account has both sides. Deploy with `firebase deploy --only functions:bootstrapTestAccountCallable` if not already deployed.

---

## iOS build / Capacitor — pod install

When **`npx cap sync ios`** fails with `rbenv: pod: command not found`, the project has existing notes: use them instead of only reporting the failure.

- **Pod install notes:** `docs/INSTALL_POD_NOTES.md` — CocoaPods install (system Ruby vs rbenv), and running `pod install` manually in `ios/App` after sync.
- **iOS multi-target:** `docs/IOS_MULTI_TARGET_SETUP.md` — includes one-time CocoaPods/signing; script **`./scripts/ios-pod-install.sh`** uses rbenv Ruby 3.2.5, `bundle install` and `bundle exec pod install` in `ios/App`. If using rbenv, run that script or `cd ios/App && bundle exec pod install` with the right Ruby.

Remember: when cap sync fails on the pod step, direct the user to these docs and/or the script.

---

## Key repo paths

| What | Path |
|------|------|
| Phase 1 spec | `docs/PHASE1_IMPLEMENTATION.md` |
| Firestore schema (Phase 1) | `docs/PHASE1_FIRESTORE_SCHEMA.md` |
| Cloud Functions | `functions/src/` (index, stripe/*, lib/*) |
| Stripe callables (frontend) | `src/lib/stripeCallables.js` |
| Feature flag | `src/lib/featureFlags.js` |
| Deposit payment UI | `src/components/DepositPaymentForm.jsx`, `src/pages/shared/BookingStatus.jsx` |
| Payout setup (talent) | `src/pages/talent/Finances.jsx` |
| Firestore rules | `firestore.rules` |
| Firebase project | `knockers-c5e30` (`.firebaserc`) |
| Pod install notes (cap sync failure) | `docs/INSTALL_POD_NOTES.md` |
| iOS pod script (rbenv) | `scripts/ios-pod-install.sh` |
| iOS multi-target setup | `docs/IOS_MULTI_TARGET_SETUP.md` |
| Verification & Badges page | `src/pages/shared/VerifyIdentityPage.jsx` |
| Identity helpers (basic + hard) | `src/lib/identityVerification.js` |
| Profile page (Account/Activity sections) | `src/pages/shared/Profile.jsx` |
| Verification gate hook | `src/hooks/useVerificationGate.js` |
| Verification modal | `src/components/VerificationModal.jsx` |
| FAQ data (shared) | `src/pages/shared/faqData.js` |
| Username uniqueness collection | Firestore: `usernames/{username}` |

---

## Audit fixes applied (30 issues)

A full technical audit identified 30 issues across 7 batches; all have been fixed:

| Batch | Issues | What was fixed |
|-------|--------|---------------|
| **1 — Listener leaks (C5, C6)** | 17 hooks / 7 files | `onSnapshot` inside async `useEffect` now properly wires cleanup. Nested listener in `useBookingMessages` tears down inner sub before re-creating. |
| **2 — Payment path (C1-C3, I3-I4, I10)** | 6 issues | `completeBooking` triggers payout callable; `payment_intent.payment_failed` webhook updates booking; verification webhook awaited; deposit guard for missing PI ID; payout guard for missing transfer ID; Stripe-in-transaction documented. |
| **3 — Collection + link (C4, C7)** | 2 issues | `useCompanies` uses `COL.companies` (with `_dev` suffix); `/talent/finances` → `/finances`. |
| **4 — Booking categories (I1)** | 1 issue | Dashboard Active tab and Activity upcoming include `pendingDeposit + confirmed + active` (not just `IN_PROGRESS`). |
| **5 — Security/gating (I2, I7, I9)** | 3 issues | `sendMessage` blocks if user doc missing; UserPosts `handleCreate` gated on verification; admin direct-write files documented for future callable migration. |
| **6 — Error handling (I5, I6, I8)** | 3 issues | `setError` in all hook catch blocks; demo fallback only when Firebase not configured; admin clears error on success. |
| **7 — Minor (M1-M13)** | 13 issues | Invalid date guards, disabled Export button, removed dead code/state, URL param sync for `showAdult`, `BOOKING_STATUS.COMPLETED` constant, stats reset, default `applications` to `[]`, PayoutBanner CSS fix. |

Files changed (hooks): `useBookings.js`, `useMessages.js`, `useListings.js`, `useEntertainers.js`, `useCompanies.js`, `useUserPosts.js`, `useFirestore.js`, `useRatings.js`, `useAdminUsers.js`.
Files changed (pages): `Dashboard.jsx` (talent + client), `Activity.jsx`, `Finances.jsx`, `BookingStatus.jsx`, `BannedPage.jsx`, `Home.jsx`, `UserPosts.jsx`, `ExplorePage.jsx`, `AcceptBooking.jsx`, `Bookings.jsx` (admin).
Files changed (functions): `webhook.ts`, `deposit.ts`, `payout.ts`.

---

## Profile + Settings restructure (completed)

Moved high-frequency items from Settings to Profile page. Repurposed identity verification into "Verification & Badges" hub.

**Changes:**
- **Profile page** (`/profile`): Added Account section (Edit Profile, Verification & Badges) and Activity section (Booking History, Saved Entertainers/Clients, Receipts). Removed "Get police check" CTA.
- **Settings page** (`/settings`): Removed Edit Profile, Verify Identity, Verification Fee, Receipts, Saved, Booking History. Kept: Password, Notifications, Payments, Safety, Sharing, Support, Admin, Legal, Logout.
- **Verification & Badges** (`/profile/verification`): If not basic-verified, shows ID upload flow (Layout gate target). If basic-verified, shows status cards + police check upload (user obtains externally from accredited provider, uploads results, team reviews). Provider link to nationalcrimecheck.com.au included.
- **Routes**: `/verify-identity` and `/settings/police-check` and `/settings/receipts` all redirect to new paths. All `navigate()` and `<Link>` references updated across codebase.
- **Identity helper**: Added `isHardVerified(userData)` in `src/lib/identityVerification.js`.
- **Deleted**: `src/pages/shared/PoliceCheck.jsx` (placeholder absorbed into Verification & Badges).
- **Backend needed**: `submitPoliceCheckCallable` and `reviewPoliceCheckCallable` in `functions/src/index.ts`; admin review UI; Firestore rules for `policeCheck` field.

---

## Location selector feature (completed)

Added to Home/Map page (`src/pages/shared/Home.jsx`):
- Safety-net 20s timeout in `requestLocation` for silent iOS denial.
- Clickable location status button with chevron opens a bottom sheet.
- Bottom sheet: "Use current location" (re-triggers GPS) + suburb search (uses existing `SuburbAutocomplete`).
- Location label states: "Getting location..." / "Current location" / "Surfers Paradise, QLD" / "Select location".

---

## UI/UX audit fixes (12 issues)

Applied a 12-issue UI/UX audit covering Profile, Settings, verification, help, signup, and location display.

| # | Issue | Files changed | Summary |
|---|-------|---------------|---------|
| 1+2 | Profile page fields | `Profile.jsx` | Removed fake @username, added real `userData.username`, email, age (from `dateOfBirth`), profile type badge. Only renders if field exists. |
| 3 | Settings placement | `Profile.jsx` | Moved Settings from top-right gear icon into Account menu list as a regular row. |
| 4 | Change Password | `Settings.jsx` | Removed from Settings; kept only in Edit Profile (`/settings/password` route still works). |
| 5 | Settings back button | `Settings.jsx` | Always navigates to `/profile` (not browser history). |
| 6 | Verification gate | `useVerificationGate.js`, `VerificationModal.jsx`, `BookingRequest.jsx`, `UserPosts.jsx`, `CreateListing.jsx` | Centralised hook + modal. `requireVerification()` returns boolean; modal handled separately. Firestore rules remain as backend enforcement. |
| 7 | Receipts CTA | `ReceiptsPage.jsx` | Added "Pay Verification Fee" button when not paid. |
| 8 | Notifications | `NotificationsPage.jsx` | Full page with toggle rows (bookings, messages, payments, verification, marketing). Saves to Firestore `notificationPreferences`. No backend delivery yet (Phase 4). |
| 9 | Payment Methods | ~~`PaymentMethodsPage.jsx`~~ | **Removed.** Stripe handles payments externally; page, route, Settings entry, and `CreditCard` import deleted. |
| 10 | Help Centre merge | `Help.jsx`, `FAQ.jsx`, `faqData.js`, `Settings.jsx`, `App.jsx` | Merged Help/FAQ/Contact into one `/help` page. Removed "Request a Call Back". `/faq` and `/contact` redirect to `/help`. Settings shows single "Help Centre" row. |
| 11 | Username system | `AuthContext.jsx`, `EditProfile.jsx`, client `Signup.jsx`, talent `Signup.jsx` | Username stored lowercase, unique via `usernames/{username}` collection. `dateOfBirth` field added. Edit profile supports username change with uniqueness check. |
| 12 | Location bug | `suburbLocation.js`, `SuburbAutocomplete.jsx`, `TalentPublic.jsx`, `ExplorePage.jsx`, `Profile.jsx` | Clean suburb name (strip parenthetical), preserve `fullLocation` for dropdown. Display-time cleanup for old Firestore data. |

**Firestore schema additions:**
- `username` (string, lowercase) on user docs
- `dateOfBirth` (string, ISO) on user docs
- `notificationPreferences` (map: `{ bookings, messages, payments, verification, marketing }`) on user docs
- `/usernames/{username}` collection: `{ userId, createdAt }`

**New files:**
- `src/hooks/useVerificationGate.js`
- `src/components/VerificationModal.jsx`
- `src/pages/shared/faqData.js`

---

## UI fixes: dropdown visibility + global top spacing

**Maps page — suburb search dropdown invisible (fixed):**
- `LocationSheet` in `src/pages/shared/Home.jsx`: changed `overflow-y: auto` to `overflow: visible`, replaced `max-height: 70vh` with `min-height: 50vh`, updated bottom padding to include `var(--bottomnav-total)` to prevent bottom nav overlap.
- `SuburbAutocomplete` container in `src/components/SuburbAutocomplete.jsx`: added `overflow: visible !important` to counteract the global `[class*="Container"] { overflow-y: auto !important }` rule in `index.css`.
- `HeaderArea` in `Home.jsx`: reduced `padding-top` from 20px to 12px since `--safe-top` now provides 20px globally.

**Global top spacing — headers flush against top edge (fixed):**
- `--safe-top` in `src/index.css`: changed from `env(safe-area-inset-top, 0px)` to `max(60px, env(safe-area-inset-top, 0px))`. Notch devices use the env value; non-notch/web get 60px minimum. Applied globally via Layout — no per-page fixes.

---

## Follow-up fixes (post-audit)

### Firestore rules — `/usernames` collection (critical)

Added `match /usernames/{username}` rules to `firestore.rules`. Authenticated users can read/create; only the owning user (`resource.data.userId == request.auth.uid`) can update/delete. **Must deploy:** `firebase deploy --only firestore:rules`.

### Date of birth — signup flows

- Added `dateOfBirth` field + `<input type="date">` + 18+ age validation to both `client/Signup.jsx` and `talent/Signup.jsx`.
- Both signup calls now pass `dateOfBirth` to `AuthContext.signup()`.
- `EditProfile.jsx`: fixed conditional spread so clearing DOB actually writes empty string to Firestore (was previously a no-op).

### PageHeader — global content spacing

- Added `margin-bottom: 16px` to `HeaderContainer` in `PageHeader.jsx`. All pages using `PageHeader` now have consistent spacing between the sticky header and the first content section. No per-page fixes needed.

### Payment Methods — removed

- Deleted `src/pages/shared/PaymentMethodsPage.jsx`.
- Removed lazy import and route from `App.jsx`.
- Removed "Payment Methods" row and `CreditCard` import from `Settings.jsx`.
- Wrapped Payments section in `{isEntertainer && (...)}` so it only shows for entertainers (Finances + Bank Details).

### Back button standardisation

Refactored 6 pages from custom back buttons to the shared `PageHeader` component (pill-style "Back" button, consistent styling, `navigate(-1)` default with `onBack` override):

| Page | Old style | Back target |
|------|-----------|-------------|
| `shared/EditProfile.jsx` | Plain text "Back" link | `/profile` (via `onBack`) |
| `shared/ChangePassword.jsx` | Plain text "Back" link | `/settings` (via `onBack`) |
| `shared/BookingStatus.jsx` | 40×40 icon circle | `/talent` or `/client` conditional (via `onBack`) |
| `shared/Conversation.jsx` | 40×40 icon circle | `/inbox` (via `onBack`) |
| `client/BookingRequest.jsx` | 40×40 icon circle | `/talent/:id` (via `onBack`) |
| `talent/EditProfile.jsx` | 40×40 icon circle | `/talent` (via `onBack`) |

Pages with `rightContent` (Save buttons, booking info links) use PageHeader's `rightContent` prop. Removed unused `Header`, `BackButton`/`BackLink`, `Title`, `Spacer` styled components from each file.

**Not refactored** (by design): Login pages, signup wizards (multi-step internal navigation), `BookNowForm` (embedded wizard), `TalentPublic` (full-bleed hero with floating circle), admin pages (separate design system).

### Entertainer signup state bug (critical fix)

**Root cause:** Two bugs preventing the app from recognising a user as an entertainer after signup.

1. **`addEntertainerProfile`** (existing user joins as entertainer): Was setting `hasEntertainerProfile: true` but NOT `role: "entertainer"`. RoleContext derives `isEntertainer` from `role`, so all `{isEntertainer && ...}` UI blocks stayed hidden. **Fix:** Added `role: "entertainer"` to the Firestore update. User is immediately switched to entertainer dashboard; can switch back to client anytime via existing toggle.

2. **`signup`** (brand new entertainer account): Was writing correct data to Firestore but NOT updating React context state. `onAuthStateChanged` would eventually sync, but a race condition with `navigate()` meant the UI could render before context updated. **Fix:** Added `setUserData(userData)` before returning from `signup()`.

**Architecture note:** `role` = active dashboard mode (switchable via "Switch to Client/Entertainer Dashboard"). `hasEntertainerProfile` = permanent capability flag. This is the Airbnb/Uber dual-mode pattern — `role` is NOT a permanent classification.

### Firestore rules — deployed (critical)

**Rules are now live on `knockers-c5e30`.** Deployed twice this session via `firebase deploy --only firestore:rules`.

Key changes deployed:
- `/usernames/{username}` — read/create for authenticated users; owner-only update/delete.
- `userAdminOnlyUnchanged()` — updated to allow users to change their own `role` between `"client"` and `"entertainer"` (dual-mode switching) while still blocking escalation to `"admin"`. Other admin-only fields (`strikes`, `isSuspended`, `isBanned`, `verificationFeePaid`, `verifiedAt`, `iapReceipt`, `verificationFeeWaivedBy`) remain fully protected.
- `entertainers` CREATE rule — relaxed from `isOwner(entertainerId) && isEntertainer()` to just `isOwner(entertainerId)`. Eliminates a cross-document race condition where `addEntertainerProfile` sets `role: "entertainer"` on the user doc then immediately creates the entertainer doc. The old rule required the entertainer doc CREATE to read back the just-updated user doc, which could fail under latency.

### Company affiliation — removed

Removed the entire company/agency code feature from the app. Stripe handles payments externally; company commission tracking is not needed.

**Deleted files:**
- `src/components/CompanyCodeInput.jsx`
- `src/hooks/useCompanies.js`
- `src/utils/seedCompanies.js`

**Modified files:**

| File | What was removed |
|------|-----------------|
| `talent/Signup.jsx` | Step 4 (Company) removed entirely; signup reduced from 5 steps to 4. `companyCode`/`companyData` state, `handleCompanyValidated`, `CompanyCodeInput` import, company fields from `buildEntertainerProfileData()` and `signup()` call, `CompanyCard`/`CompanyName`/`CompanyCommission`/`SectionTitle`/`SectionDescription` styled components. |
| `talent/EditProfile.jsx` | Entire "Company Affiliation" section removed. `companyCode`/`pendingCompany`/`unlinking` state, `handleCompanyValidated`/`handleLinkCompany`/`handleUnlinkCompany` functions, `CompanyCodeInput`/`linkToCompany`/`unlinkFromCompany` imports, `CompanyCard`/`CompanyIcon`/`CompanyInfo`/`CompanyName`/`CompanyDetail`/`UnlinkButton`/`LinkButton` styled components. |
| `talent/TalentPublic.jsx` | "Works with {companyName}" badge removed. `CompanyBadge`/`CompanyBadgeIcon` styled components. |
| `talent/Finances.jsx` | Company commission note block removed. `CompanyNote` styled component. |
| `client/BookingRequest.jsx` | `if (entertainer?.companyId)` block removed (no longer copies company fields to booking data). |
| `hooks/useBookings.js` | `if (bookingData.companyId)` block removed (no longer stores company commission on booking records). |
| `lib/collections.js` | `companies` removed from `COL` object and `paths.company` helper removed. |

Firestore rules for `/companies` and `/companies_dev` left in place (harmless, unused). Existing company data on entertainer/booking docs in Firestore is also harmless (ignored fields).

---

*Last updated: Firestore rules deployed (role switching, entertainer CREATE relaxed, usernames collection). Company affiliation removed from entire app. Profile save and entertainer signup permissions issues fixed. Awaiting Stripe setup + deploy + test + backend police check callables.*
