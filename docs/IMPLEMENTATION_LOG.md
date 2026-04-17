# Implementation log

## 2026-02-24: Apple review account dual-role access

**Goal:** Enable `apple-review@knockers.app` to access both Client and Entertainer modes for App Store review, without changing behavior for normal users or creating backdoors.

### Firestore (users/{uid} for apple-review@knockers.app)

- **Schema unchanged.** The app uses a single `role` field (`"client"` | `"entertainer"` | `"admin"`) and derives “has entertainer profile” from the existence of `entertainers/{uid}`.
- **Required for dual-role:**
  - `users/{uid}` must have `role` set to `"client"` or `"entertainer"` (user can switch in-app).
  - `entertainers/{uid}` must exist so the app shows “View as client” / “View as entertainer” and entertainer flows work.
- **Optional:** Admin can set `verificationFeeWaivedBy` on the user doc so the account is not blocked by the $2 verification fee (the app also waives verification for this email in code).
- **Bootstrap:** The existing callable `bootstrapTestAccountCallable` is restricted to this email; when the test account calls it, it ensures a user doc with `role: "client"` and creates an entertainer doc. Run once after creating the Auth user if needed.

### Frontend changes (isolated to apple-review@knockers.app)

1. **`src/lib/appleReview.js`** (new)
   - `APPLE_REVIEW_EMAIL = "apple-review@knockers.app"`.
   - `isAppleReviewAccount(user)` – true when `user.email` is that address.
   - `verifyAppleReviewDualRole(user, userData, hasEntertainerProfile)` – DEV-only helper; logs a warning if this account does not have both roles configured (role set + entertainer doc).

2. **`src/context/RoleContext.jsx`**
   - For this email, `hasEntertainerProfile` is forced to `true` so they always see the role switch and can use entertainer features.
   - DEV-only effect calls `verifyAppleReviewDualRole` when user/userData/hasEntertainerProfile are available; logs if misconfigured.

3. **`src/components/ProtectedRoute.jsx`**
   - `RequireClient` and `RequireEntertainer`: if `isAppleReviewAccount(user)`, allow access regardless of current `role`, so they can open both `/client` and `/talent` (and related routes).

4. **`src/lib/verificationFee.js`**
   - `canUsePaidFeatures(userData, user?)`: optional second argument; if `user` is the Apple review account, returns `true` (verification fee gate waived for this account only).

5. **`src/components/Layout.jsx`**
   - Banned check: do not show `BannedPage` for the Apple review account (`!isAppleReviewAccount(user)` in the condition).

6. **`src/pages/talent/AcceptBooking.jsx`**
   - Verification gate: pass `user` into `canUsePaidFeatures(userData, user)`.
   - Ban/suspend block: only show “Account banned/suspended” when not the Apple review account.

7. **`src/pages/client/BookingRequest.jsx`**, **`src/pages/client/CreateListing.jsx`**, **`src/pages/shared/VerificationFeePage.jsx`**
   - Pass `user` into `canUsePaidFeatures(userData, user)` where available.

8. **`src/hooks/useMessages.js`** (sendMessage)
   - When loading the sender’s user doc, if sender is the Apple review account (`isAppleReviewAccount({ email: u.email })`), skip ban, suspend, and verification fee checks so they can send messages.

### Backend (Cloud Functions)

- **`functions/src/index.ts`**
  - Added `APPLE_REVIEW_EMAIL` and `isAppleReviewEmail(email)`.
  - **Dispute resolution** (strike applied when dispute upheld): if the strike target’s user doc has email = Apple review email, do not set `isBanned` / `isSuspended` (strikes still incremented for audit).
  - **`issueStrikeCallable`**: same rule – do not auto-ban or auto-suspend the Apple review account; strikes still applied.

### What was not changed

- No new admin or debug UI.
- No change to database schema (no `roles: { client, entertainer }` object).
- All existing permission checks and role logic preserved for non–Apple-review users.
- No backdoors; the only special case is the single email above.

### Validation checklist (after implementation)

- [ ] Log in as `apple-review@knockers.app`.
- [ ] Client dashboard works (e.g. `/client`).
- [ ] Entertainer profile/dashboard works (e.g. `/talent`).
- [ ] Can switch between Client and Entertainer via Profile / “View as client” / “View as entertainer”.
- [ ] Can create/accept bookings and open chat.
- [ ] Can view receipts (Settings → Receipts).
- [ ] No verification fee gate (or fee waived in Firestore).
- [ ] Account is not blocked by ban/suspend in UI or in messaging; backend does not auto-ban/auto-suspend this account on strikes.
