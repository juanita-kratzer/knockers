# Knockers Codebase Audit & Gap Analysis

**Date:** February 2025  
**Scope:** Full codebase audit and gap analysis only — no code changes, refactors, or dependency updates.  
**Product intent:** Dual-sided marketplace (User/Booker + Entertainer). Core flow: browse → request → accept/decline → deposit/payment → chat after deposit → arrival code → completion → payout → anonymous review → safety button (entertainer).

---

## A) Current State Summary

### Repo & Stack
- **Framework:** React 19 + Vite 7 (`src/App.jsx`, `vite.config.js`, `package.json`).
- **Routing:** React Router v7 (`react-router-dom`), single `Layout` with `Outlet`, `ScrollToTop`, `ErrorBoundary`.
- **Styling:** `styled-components` v6; theme variables via CSS vars (e.g. `theme.bg`, `theme.primary`, `theme.card`).
- **State:** No global store; React state + `AuthContext` (`src/context/AuthContext.jsx`) and `RoleContext` (`src/context/RoleContext.jsx`). Role/entertainer profile derived from Firestore `users` and `entertainers`.
- **Firebase:** Auth, Firestore, Storage, Functions. Init in `src/firebase.js` (only if `VITE_FIREBASE_API_KEY` set). Firestore uses env-based collection suffix: `import.meta.env.DEV` → `_dev` suffix (`src/lib/collections.js`).
- **Stripe:** Client: `@stripe/react-stripe-js`, `@stripe/stripe-js`; feature flag `VITE_STRIPE_ENABLED`. Server: Cloud Functions (TypeScript) in `functions/` — Connect, PaymentIntent for deposit, webhook, payout, cancel. Region `australia-southeast1`.
- **Maps:** `@react-google-maps/api` on Home (map-based browse); `VITE_GOOGLE_MAPS_API_KEY`.
- **Notifications:** No FCM/Twilio found in repo; Firebase Messaging sender ID in config but no push/notification handlers in app code.
- **Verification services:** No Stripe Identity or Veriff integration; ID verification and police check are placeholders (Police Check page is “coming soon”).
- **Environments:** Scripts use `.env`, `.env.staging`, `.env.prod` (copied to `.env` for build). Functions use `functions/.env` or Firebase config; `FUNCTIONS_EMULATOR` / `NODE_ENV` for `_dev` suffix.

### Key env / config (where loaded)
- **Client (Vite):** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID` (`src/firebase.js`); `VITE_GOOGLE_MAPS_API_KEY` (`src/pages/shared/Home.jsx`); `VITE_STRIPE_PUBLISHABLE_KEY` (`src/components/DepositPaymentForm.jsx`); `VITE_STRIPE_ENABLED` (`src/lib/featureFlags.js`).
- **Functions:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ENABLED`, `APP_URL`, `NODE_ENV`, `FUNCTIONS_EMULATOR`, `TEST_ACCOUNT_EMAIL` (`functions/src/lib/config.ts`, `functions/.env.example`).

### What Exists Now
- **Auth:** Email/password sign-in; signup for client and entertainer; `ensureUserProfileCallable` and `bootstrapTestAccountCallable` for profile/bootstrap.
- **Roles:** `RequireAuth`, `RequireClient`, `RequireEntertainer`, `RedirectIfAuth`, `RedirectIfEntertainer`; role from `users.role` and entertainer doc existence.
- **Bookings:** Create request from client; entertainer accept/decline (Dashboard uses `acceptBooking` with **zero** deposit/total); deposit flow (Stripe PaymentIntent + webhook) and 10‑minute deadline in client logic; `BookingStatus` deposit UI; completion and payout callable.
- **Chat:** Messages in `bookings/{id}/messages`; `useBookingMessages`, `useConversations`, `sendMessage`; Conversation and Inbox pages. **Chat is allowed for ACCEPTED before deposit** (spec says chat only after deposit).
- **Cancellation:** `cancelBookingWithFeesCallable`; backend uses **$80** >72h and full <72h (spec mentioned $30 cancellation fee — clarify intended amount).
- **Listings:** Client job posts (`listings`), entertainers apply (`listingApplications`); CreateListing has **blocked content** (phone/email/@) validation.
- **Ratings:** `ratings` collection; `useRatings.js` with anonymous period (7 days); submit and read for entertainer/client.
- **Safety:** `SafetyButton` and `triggerSafetyAlert` exist; **SafetyButton is not imported anywhere** (not in Conversation or BookingStatus). `ArrivalCodeEntry` exists; **ArrivalCodeEntry is not imported anywhere**; `generateArrivalCode` is never called from UI (client never sees/generates code for entertainer).
- **Content blocking:** Phone/email/@ blocking only in **CreateListing** (`src/pages/client/CreateListing.jsx`). No blocking in booking notes, entertainer bio, or chat.
- **Booking history:** Settings “Booking History” links to `/bookings/history` for **both** roles; route renders **ClientDashboard** only — entertainers see client dashboard when they tap Booking History.
- **Finances (Firestore):** Rules use `odwnerId` (typo); intended `ownerId` — so entertainer read on `finances` may never match. `finances` collection not clearly written by functions (payout writes to booking, not a separate finances doc).

---

## B) Critical Issues (Must Fix First)

1. **Security – Firestore rules `hasRole()`**  
   `hasRole(role)` uses `get(/databases/$(database)/documents/users/$(request.auth.uid))` — **hardcoded `users`**. In dev the app uses `users_dev`; rule always reads `users`. So in dev, role checks can hit wrong collection or missing doc. **Fix:** Use same suffix as app (e.g. pass or derive `_dev` in rules) or duplicate role into a single collection used by rules.

2. **Security – Firestore `finances` rule typo**  
   `firestore.rules` line 343: `resource.data.odwnerId` → should be `ownerId`. As written, entertainer read on own finances will fail.

3. **Bug – BookingStatus: `isClient` used before declaration**  
   In `src/pages/shared/BookingStatus.jsx`, `showDepositFlow` (lines 44–48) uses `isClient`, but `isClient` is defined at line 74 (after early returns). This causes `ReferenceError: Cannot access 'isClient' before initialization`. **Fix:** Move `const isClient = booking.clientId === user?.uid` and `isEntertainer` above the `showDepositFlow` block (e.g. right after the early returns for loading/error/!booking).

4. **Broken flow – Entertainer accept with zero deposit**  
   Talent Dashboard calls `acceptBooking(bookingId)` which uses `acceptBookingWithDeposit(bookingId, { depositAmount: 0, totalAmount: 0, ... })`. So deposit and total are 0; `createDepositPaymentIntent` then requires `depositCents > 0` and will throw. **Fix:** Entertainer must set deposit (and total) when accepting (e.g. accept screen with amount fields or redirect to a “Set deposit” step before confirming).

5. **Wrong role – Booking History for entertainers**  
   Settings “Booking History” links to `/bookings/history` for both roles; route is `ClientDashboard`. Entertainers see the client dashboard (listings, client bookings). **Fix:** Either route `/bookings/history` by role (e.g. entertainer → talent dashboard or dedicated history page) or add separate route for entertainer booking history.

6. **Chat opens before deposit**  
   Spec: chat only after deposit. Code: `useMessages.js` and `sendMessage` allow messaging when status is `ACCEPTED`, `DEPOSIT_PAID`, or `IN_PROGRESS`. So chat is open after accept, before payment. **Fix:** Restrict `canMessage` and message send to `DEPOSIT_PAID` (and `IN_PROGRESS`, `COMPLETED`) only; hide/disable Inbox thread and Conversation until deposit paid.

7. **Safety button and arrival code not in UI**  
   `SafetyButton.jsx` and `ArrivalCodeEntry.jsx` are never imported. So: no safety button for entertainers in chat/booking view; no arrival code flow (client never generates code, entertainer never enters it). **Fix:** Add SafetyButton to Conversation or BookingStatus for entertainer when status allows; add flow for client to generate/show arrival code and for entertainer to enter it (e.g. BookingStatus or modal using `ArrivalCodeEntry`).

---

## C) Functional Gaps vs Spec

| Intended flow / feature | Current state | Gap |
|-------------------------|---------------|-----|
| Browse → request | Explore + map Home; BookingRequest form (date, time, duration, location, notes) | Largely in place. |
| Accept/decline | Accept/decline in Talent Dashboard | Accept uses **zero** deposit/total; no UI for entertainer to set deposit/total. |
| Deposit + platform fee | PaymentIntent + $30 platform fee in functions; BookingStatus deposit UI | Backend correct; client flow breaks if deposit not set (see B.4). |
| 10‑minute pending payment window | `depositDeadline` set in `acceptBookingWithDeposit` (10 min); deposit.ts checks deadline | In place; entertainer must set amounts so PaymentIntent is valid. |
| Chat only after deposit | Messages allowed for ACCEPTED | Chat opens before deposit (see B.6). |
| Arrival confirmation code | `generateArrivalCode`, `startBooking`, `ArrivalCodeEntry` exist | Not wired: no UI to generate or enter code. |
| Optional location sharing | `startBooking` accepts `shareLocation`/location; safety alert stores location | No arrival flow in UI. |
| Booking completion + payout release | `completeBooking` (client); `releasePayoutOnCompletionCallable` (entertainer) | Talent Dashboard “Mark Complete” calls both. Payout requires Connect onboarded. |
| Reviews/ratings + anonymity window | `ratings` collection; 7‑day `visibleAfter` in useRatings | In place. |
| Disputes | `disputes` collection and rules exist; RatingModal can dispute | No full dispute UI flow documented in audit. |
| Cancellation policy + fee | cancel callable: >72h $80, <72h full; entertainer cancel refund + strike | Spec said $30 cancellation fee — confirm whether $80 or $30. |
| $30 cancellation fee (entertainer) | cancel.ts records strike; “no charge to entertainer card” in Phase 1 | No negative balance or block-new-bookings until paid. |
| Negative balance blocking | Not implemented | Entertainer can continue accepting after cancellation without paying fee. |
| No full service / no nudity / no explicit images | No content or image checks in code | Policy only; no automated checks. |
| Block phone/email/@ in posts | CreateListing only | Missing: BookingRequest notes, entertainer bio, listings description elsewhere, **chat messages**. |
| Soft vs hard profile (ID vs ID + police check) | `profileType` soft/hard in user/entertainer; Police Check page placeholder | ID verification and police check not implemented. |
| Safety button (entertainer only) | Component and trigger exist | Not rendered anywhere (see B.7). |

---

## D) Broken Navigation / Missing Pages

| Location | Expected behavior | Actual behavior | Fix suggestion |
|----------|-------------------|-----------------|----------------|
| Settings → Booking History (entertainer) | See entertainer booking history | Renders ClientDashboard (listings + client bookings) | Route by role: e.g. entertainer → `/talent` or `/talent/activity` history tab or new `/bookings/history` that switches by role. |
| Settings → Edit Profile | Edit name, email, phone, photo (and profile type) | Goes to `/profile/edit` (shared EditProfile) | OK; confirm entertainer-specific fields if they use talent edit. |
| Settings → Join as Entertainer | Go to add entertainer profile | Links to `/talent/signup` (RedirectIfEntertainer) | OK. |
| Profile → Police check | Upgrade to hard profile | Police Check page is “coming soon” | Implement or remove from nav until ready. |
| BookingStatus (client) back | Back to client home/dashboard | BackButton to `/client` | OK. |
| BookingStatus (entertainer) back | Back to talent dashboard | BackButton to `/talent` | OK. |
| Conversation back | Back to Inbox | BackButton to `/inbox` | OK. |
| App route `/profile/public/:id` | Public profile view | Redirects to `/talent/:id` | OK. |
| Missing route | Entertainer booking history as dedicated page | No route | Add route or reuse dashboard with history tab. |
| BottomNav “Bookings” (entertainer) | Talent dashboard | Goes to `/talent` | OK. |
| BottomNav “Bookings” (client) | Client dashboard | Goes to `/client` | OK. |

All Settings sub-pages (Notifications, Payment Methods, Bank, Emergency Contact, Share Profile, Referral) have routes and `PageHeader` with `showBack`. Saved/Blocked pages have routes and back. **Assumption:** About, Terms, Help, FAQ, Contact exist and render (lazy-loaded in App).

---

## E) Data Model Map

### Collections (with `_dev` suffix when `import.meta.env.DEV`)

| Collection | Purpose | Document schema / key fields | Indexes | Security (summary) |
|------------|---------|-----------------------------|---------|--------------------|
| **users** | Auth-linked profile, role | uid, email, name, phone, photoURL, role, hasEntertainerProfile, ageVerified, profileType, createdAt | — | Read: auth; write: owner. |
| **entertainers** | Public profile | userId, displayName, bio, suburb, categories, subCategories, profileType, isActive, isAdultContent, verificationStatus, rating, reviewCount, bookingCount, photos, pricing, stripe.*, createdAt, updatedAt | — | Read: all; write: owner; stripe server-only. |
| **bookings** | Request → completion | clientId, entertainerId, status, eventDate, eventTime, location, duration, notes, depositAmount, totalAmount, entertainerAmount, platformFee, depositDeadline, acceptedAt, paymentStatus, stripe.*, payout.*, cancellation.*, arrivalCode, lastMessage, lastMessageAt, createdAt, updatedAt | clientId+createdAt, clientId+updatedAt, entertainerId+createdAt, entertainerId+updatedAt, clientId+status+updatedAt, entertainerId+status+updatedAt | Read: client or entertainer; create: client; update: party, no payment keys. |
| **bookings/{id}/messages** | In-booking chat | senderId, senderName, message, createdAt | — | Read/write: booking participants only. |
| **reviews** | (Defined in COL) | Not used in code; ratings used instead | — | — |
| **ratings** | Reviews with anonymity | bookingId, reviewerId, reviewerType, revieweeId, revieweeType, rating, review, visibleAfter, isDisputed, createdAt | — | Read: auth; create: reviewer; update: reviewee (dispute fields). |
| **userPosts** | ASAP requests (user posts) | userId, … | — | Read: auth; create: owner; update: owner or entertainer. |
| **listings** | Client job posts | clientId, status, title, description, location, eventDate, … | status+createdAt, clientId+createdAt | Read: owner or status=open; create/update: client. |
| **listingApplications** | Entertainer applications | listingId, entertainerId, … | listingId+createdAt | Read: applicant or listing owner; create: entertainer; update: listing owner. |
| **safetyAlerts** | Safety button logs | bookingId, entertainerId, clientId, location, triggeredAt, status | — | Read/create: entertainer own. |
| **disputes** | Review disputes | — | — | Read: auth; create: auth; no update/delete. |
| **blockedContacts** | Blocked users | userId, … | — | Read/write: owner. |
| **favorites** | Saved entertainers/clients | userId, … | — | Read/create/delete: owner. |
| **payments** | Payment audit (optional) | bookingId, type, amountCents, stripeRefs, status, createdAt | — | Read: parties; write: false. |
| **finances** | Entertainer earnings (per doc) | Rule typo: odwnerId | — | Read: intended owner only; broken by typo. |
| **companies** | (Optional) | — | — | Read: auth; write: false. |

### Booking status values (useBookings.js)
REQUESTED, ACCEPTED, DEPOSIT_PENDING, DEPOSIT_PAID, IN_PROGRESS, COMPLETED, DECLINED, CANCELLED, EXPIRED, DISPUTED.

### Notes
- **Booking history:** Should be derived from `bookings` where `clientId` or `entertainerId` == current user; ClientDashboard uses `useClientBookings`; entertainer uses `useEntertainerBookings` on Talent Dashboard — no dedicated “history” route for entertainer that shows same list.
- **reviews** in COL is not used; app uses **ratings** with `visibleAfter` for anonymity.
- **finances** rule and possible usage: fix `odwnerId` → `ownerId`; confirm whether any function writes to `finances` or only to `bookings.payout` / Stripe.

---

## F) Payments Map

### How money flows today
1. **Client pays deposit:** Client on BookingStatus → “Continue to payment” → `createDepositPaymentIntentCallable` → PaymentIntent (deposit + 3000 cents platform fee) → Stripe Elements → card charge. Webhook `payment_intent.succeeded` → booking `paymentStatus` = DEPOSIT_PAID, status = deposit_paid.
2. **Platform fee:** Kept from charge (no separate transfer); amount in metadata.
3. **Payout to entertainer:** Entertainer “Mark Complete” → `releasePayoutOnCompletionCallable` → Stripe Transfer from charge to Connect account (amount = deposit only). Booking updated with `paymentStatus` = PAYOUT_SENT, `stripe.transferId`, `payout.releasedAt`.
4. **Cancellation:** `cancelBookingWithFeesCallable`: client >72h → $80 fee (refund rest); client <72h → full charge; entertainer cancel → refund client, strike recorded, no charge to entertainer in Phase 1.
5. **Connect:** Entertainer sets up Stripe Express in Finances; `createConnectAccountCallable` / `getConnectOnboardingLinkCallable`; onboarding link; account status synced (e.g. `syncConnectAccountStatus` in connect.ts; webhook account.updated not confirmed in audit).

### What’s missing
- **$30 booking fee:** Applied as platform fee (3000 cents) in deposit; no separate “booking fee” line in UI (shown as “+ $30 platform fee” in BookingStatus). Spec “$30 cancellation fee” for entertainer: backend uses platform fee in strike; no actual charge to entertainer or negative balance.
- **Cancellation fee ($30 vs $80):** Backend uses $80 for client cancel >72h; spec mentioned $30 — confirm intended amounts.
- **Negative balance / block new bookings:** No logic to block entertainer from accepting when they owe cancellation fee; no “negative balance” or pay-first flow.
- **Payment methods / bank:** Settings pages exist; no audit of Stripe Customer or payment method attachment for clients (PaymentIntent uses automatic_payment_methods; no Customer id stored in user doc found).
- **Webhooks:** Only `payment_intent.succeeded` and `payment_intent.payment_failed` handled; signature verified with `getStripeWebhookSecret()`. No `account.updated` for Connect status sync in reviewed code (sync exists as function but may need to be invoked by webhook).

---

## G) Recommended Implementation Order

### P0 (Critical – security and broken flows)
1. Fix **BookingStatus** `isClient` declaration order so deposit flow runs for client.
2. Fix **Firestore** `finances` rule: `odwnerId` → `ownerId` (and ensure documents use that field if used).
3. Fix **Firestore** `hasRole()` to use correct collection (e.g. `users_dev` when app uses dev suffix) or otherwise align rule with app collections.
4. **Entertainer accept:** Add UI and flow for entertainer to set deposit (and total) when accepting; call `acceptBookingWithDeposit` with real amounts so PaymentIntent can be created.
5. **Booking History for entertainers:** Route or page so “Booking History” shows entertainer’s bookings, not ClientDashboard.
6. **Chat after deposit only:** Restrict messaging and Inbox to DEPOSIT_PAID (and IN_PROGRESS, COMPLETED); remove ACCEPTED from allowed statuses in useMessages and sendMessage.

### P1 (Core product)
7. Wire **arrival code:** Client generates/reveals code (e.g. on BookingStatus after deposit paid); entertainer enters it (e.g. ArrivalCodeEntry in BookingStatus or Conversation); call `generateArrivalCode` when appropriate and `startBooking` on submit.
8. Wire **safety button:** Render SafetyButton in Conversation or BookingStatus for entertainer when booking is DEPOSIT_PAID or IN_PROGRESS; ensure emergency contact is configurable (EmergencyContactPage is placeholder).
9. **Block phone/email/@ in** booking notes, entertainer bio, and chat (client- and server-side where feasible).
10. **Negative balance / cancellation fee for entertainer:** Define behaviour ($30 charge or strike); block new accepts when balance < 0 until paid (or document as manual process).
11. Align **cancellation fee** with product: confirm $30 vs $80 and where each applies; update copy and backend if needed.

### P2 (Polish and compliance)
12. **Verification:** Implement or remove ID verification and police check placeholders; enforce “no personal info before deposit” in UI/copy.
13. **Notifications:** FCM or other push for new request, accept, message, etc., if required.
14. **Payments audit:** Write to `payments` collection for each deposit/refund/payout for audit trail.
15. **Disputes:** Full dispute flow and visibility for ratings.
16. **Content moderation:** No nudity/explicit images (policy + manual/automated checks as needed).

---

## H) Questions for Lawyer / Compliance Checklist

*(Not legal advice; for discussion with counsel.)*

1. **Data retention:** Message content is stored in Firestore (`bookings/{id}/messages`). What retention and deletion policy is required? Who can access (platform, parties, authorities)?
2. **Legal access to chats:** Under what circumstances can the platform or authorities access or disclose chat content? Is this disclosed in Privacy Policy / Terms?
3. **PII in listings/messages:** Phone/email/@ blocking exists only in CreateListing. Should booking notes and chat be filtered or blocked from containing PII? Is that sufficient for your jurisdiction?
4. **ID and police checks:** Stored or processed where? Are Stripe Identity or third-party checks required, and what consent and disclosure are needed?
5. **Safety alerts:** Storing location and client name in `safetyAlerts` and notifying emergency contact — consent, data minimization, and retention?
6. **Payment and cancellation terms:** Are $30 vs $80 cancellation fees and “negative balance”/blocking clearly stated in Terms and cancellation policy?
7. **Age verification:** Current “18+” is self-declaration. Is that sufficient for adult content and services in your market?
8. **Reviews and anonymity:** 7‑day anonymous period and dispute process — any required disclosures or limits?

---

**End of audit.** All findings are from static analysis and code paths traced; behaviour in production may depend on config, data, and environment. Confirm assumptions (e.g. cancellation amounts, role of `finances` collection) with product and backend before implementing fixes.
