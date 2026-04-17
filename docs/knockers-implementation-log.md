# Knockers implementation log

Log of fixes and wiring implemented from the codebase audit. No refactors or dependency changes.

---

## P0 — Critical (security + broken flows + routing + chat gating)

### (1) BookingStatus crash: `isClient` used before declaration
- **File:** `src/pages/shared/BookingStatus.jsx`
- **Change:** Moved early returns (loading, error/!booking) above role/booking-derived state. Declare `isClient`, `isEntertainer`, and `canMessage` immediately after those returns, then compute `showDepositFlow`, `showPaymentProcessing`, `canShowPaymentForm`.
- **Result:** No ReferenceError; deposit flow renders correctly for client.

### (2) Firestore finances rule typo
- **File:** `firestore.rules`
- **Change:** In `match /finances/{odcId}`, `resource.data.odwnerId` → `resource.data.ownerId`.
- **Note:** Backend/writes to `finances` may need to use field `ownerId` for reads to succeed.

### (3) Firestore `hasRole()` and _dev collections
- **File:** `firestore.rules`
- **Change:** `hasRole(role)` now checks both `users/{uid}` and `users_dev/{uid}` using `exists()` before `get()`, so dev (users_dev) and prod (users) both work.
- **Result:** Role-based rules work in dev and prod.

### (4) Entertainer accept flow with deposit/total
- **Files:**  
  - **New:** `src/pages/talent/AcceptBooking.jsx` — form for deposit amount, total (your fee), optional price breakdown; validates deposit > 0, total > 0, deposit ≤ client total (total + platform fee); calls `acceptBookingWithDeposit` and redirects to booking status.  
  - **Updated:** `src/pages/talent/Dashboard.jsx` — Accept button now links to `/talent/bookings/:bookingId/accept`; removed direct `acceptBooking` call and `handleAccept`.  
  - **Updated:** `src/App.jsx` — lazy import `AcceptBooking`, route `/talent/bookings/:bookingId/accept` with `RequireEntertainer`.
- **Result:** Entertainer must set deposit and total when accepting; PaymentIntent can be created with valid amounts.

### (5) Booking History route for entertainer
- **Files:**  
  - **New:** `src/pages/shared/BookingHistory.jsx` — role-aware page using `useRole()`; client uses `useClientBookings`, entertainer uses `useEntertainerBookings`; renders Active and Past sections with View Details / Message / Cancel / Leave Review as appropriate.  
  - **Updated:** `src/App.jsx` — `/bookings/history` now renders `BookingHistory` instead of `ClientDashboard`.
- **Result:** Both roles see their own booking history at Settings → Booking History.

### (6) Chat only after deposit
- **Files:**  
  - `src/hooks/useMessages.js`: `canMessage` and inbox `allowedStatuses` limited to `DEPOSIT_PAID`, `IN_PROGRESS`, `COMPLETED` (removed `ACCEPTED`). `sendMessage` rejects unless status is in that list.  
  - `src/pages/shared/Conversation.jsx`: Locked copy set to “Chat unlocks after deposit is paid.”  
  - `src/pages/client/Dashboard.jsx`: Message button shown only for `DEPOSIT_PAID` and `IN_PROGRESS` (not `ACCEPTED`).
- **Result:** Chat and Inbox only after deposit is paid.

### (7) Cancellation / platform fee policy source
- **Files:**  
  - **New:** `src/lib/policies.js` — `CANCELLATION_POLICY` (userCancelWithinHours, userCancelOutsideFeeCents, entertainerCancelFeeCents, platformFeeCents), `PLATFORM_FEE_DOLLARS`, `USER_CANCEL_OUTSIDE_FEE_DOLLARS`; comment to keep backend in sync.  
  - **Updated:** `src/pages/shared/BookingStatus.jsx` — deposit copy uses `PLATFORM_FEE_DOLLARS`.  
  - **Updated:** `src/pages/talent/AcceptBooking.jsx` — all platform fee copy uses `PLATFORM_FEE_DOLLARS`.
- **TODO:** Backend (Cloud Functions) currently uses $80 for client cancel >72h; FAQ/copy also mention $30 in places. Align backend and FAQ/Terms with `policies.js` when product is finalised.

---

## P1 — Core product wiring

### (8) Arrival code end-to-end
- **File:** `src/pages/shared/BookingStatus.jsx`
- **Change:**  
  - Client + `DEPOSIT_PAID`: “Arrival code” card — “Generate code” (calls `generateArrivalCode(bookingId)`) or display `booking.arrivalCode`.  
  - Entertainer + `DEPOSIT_PAID`: “Confirm arrival” opens `ArrivalCodeEntry` modal; on submit, `startBooking` runs with code and optional location.  
  - Imports: `generateArrivalCode`, `ArrivalCodeEntry`; state: `codeGenerating`, `showArrivalModal`.  
  - New styled: `ArrivalCard`, `ArrivalTitle`, `ArrivalCodeDisplay`, `ArrivalHint`, `ArrivalButton`.
- **Result:** Client can generate and share code; entertainer can enter code to start booking (IN_PROGRESS).

### (9) Safety button (entertainer only)
- **Files:**  
  - `src/components/SafetyButton.jsx`: New prop `hasEmergencyContact` (default true). When false, first click opens blocking modal “Add emergency contact to enable Safety Button” with link to `/settings/emergency-contact`.  
  - `src/pages/shared/Conversation.jsx`: Renders `SafetyButton` for entertainer when `canMessage` and status is `DEPOSIT_PAID` or `IN_PROGRESS`; `hasEmergencyContact` from `userData?.emergencyContactPhone || userData?.emergencyContactEmail`.  
  - `src/pages/shared/BookingStatus.jsx`: Renders `SafetyButton` for entertainer when status is `DEPOSIT_PAID` or `IN_PROGRESS`; same `hasEmergencyContact` from `userData`.
- **Assumption:** When Emergency Contact settings are implemented, they should set `emergencyContactPhone` and/or `emergencyContactEmail` on the user doc so the button is enabled.

### (10) Content moderation beyond listings
- **Files:**  
  - **New:** `src/lib/contentModeration.js` — `containsForbiddenContactInfo(text)`, `sanitizeOrReject(text)` (phone, email, @handle, contact-style keywords).  
  - **Updated:** `src/lib/policies.js` — `ALLOW_CONTACT_INFO_AFTER_DEPOSIT = true` (allow contact in chat only after deposit paid).  
  - **Updated:** `src/pages/client/BookingRequest.jsx` — before submit, `sanitizeOrReject(formData.notes)`; alert and abort if not ok.  
  - **Updated:** `src/pages/talent/EditProfile.jsx` — before save, `sanitizeOrReject(formData.bio)`; alert and abort if not ok.  
  - **Updated:** `src/hooks/useMessages.js` — in `sendMessage`, if `!ALLOW_CONTACT_INFO_AFTER_DEPOSIT` or booking status not in messageable list, run `sanitizeOrReject(message)` and throw with reason if not ok.
- **Result:** Booking notes, entertainer bio, and (when policy disallows) chat are checked for contact info; UX shows inline/alert error.

---

## P1.5 — Quick checks

### (11) Settings “Booking History”
- **Check:** Settings already links to `/bookings/history`; that route now renders role-aware `BookingHistory`. No change to Settings required.

### (12) Profile empty-state clickability
- **Check:** Not changed in this pass. Audit noted “Bookings made” and “Repeat entertainers” should remain clickable when count = 0 and show empty state; left for a follow-up if needed.

---

## File list (changed or new)

| Path | Change |
|------|--------|
| `firestore.rules` | finances `ownerId`; `hasRole()` checks users + users_dev |
| `src/App.jsx` | BookingHistory route; AcceptBooking route + lazy import |
| `src/pages/shared/BookingStatus.jsx` | isClient order; arrival code + SafetyButton; policies import |
| `src/pages/shared/Conversation.jsx` | SafetyButton; SafetyWrap; BOOKING_STATUS; showSafetyButton + hasEmergencyContact |
| `src/pages/shared/BookingHistory.jsx` | **New** — role-aware booking history |
| `src/pages/talent/AcceptBooking.jsx` | **New** — accept with deposit/total form |
| `src/pages/talent/Dashboard.jsx` | Accept → Link to accept page; remove acceptBooking import/handler |
| `src/pages/client/Dashboard.jsx` | Message button only for DEPOSIT_PAID/IN_PROGRESS |
| `src/pages/client/BookingRequest.jsx` | contentModeration for notes |
| `src/pages/talent/EditProfile.jsx` | contentModeration for bio |
| `src/hooks/useMessages.js` | canMessage/allowedStatuses deposit-only; sendMessage contact check + policies |
| `src/lib/policies.js` | **New** — CANCELLATION_POLICY, PLATFORM_FEE_DOLLARS, ALLOW_CONTACT_INFO_AFTER_DEPOSIT |
| `src/lib/contentModeration.js` | **New** — containsForbiddenContactInfo, sanitizeOrReject |
| `src/components/SafetyButton.jsx` | hasEmergencyContact; blocking modal + link to emergency contact settings |

---

## Assumptions / TODOs

- **Finances collection:** Rules now use `ownerId`. If nothing writes to `finances` yet, confirm schema (e.g. `ownerId`) when adding server-side writes.
- **Cancellation fee:** Backend uses $80 >72h; some copy says $30. `policies.js` documents both; backend and FAQ/Terms to be aligned when final.
- **Emergency contact:** Safety button uses `userData.emergencyContactPhone` or `userData.emergencyContactEmail` to decide if contact is set; Emergency Contact settings page is still a placeholder until those fields are stored.

---

## Phase 3 — Legal Foundation

Legal document structure, draft documents, acceptance tracking, and routes. No changes to core booking/payment logic.

### Files created

| Path | Description |
|------|-------------|
| `legal/privacy-policy-draft.md` | Privacy Policy draft (data collected, storage, access, disclosure, retention, rights, contact placeholders) |
| `legal/terms-and-conditions-draft.md` | Terms & Conditions draft (marketplace connector, contractors, no employment, prohibited conduct, cancellation ref to policy, liability, indemnity, governing law placeholder) |
| `legal/entertainer-contractor-agreement-draft.md` | Entertainer Contractor Agreement draft (independent contractor, tax/insurance, payment, cancellation, code of conduct, prohibited conduct, review/strike policy, group liability placeholder) |
| `legal/user-booking-agreement-draft.md` | User Booking Agreement draft (booking responsibility, guest liability, misrepresentation, ID, cancellation, arrival code, reviews, safety, payment) |
| `legal/lawyer-review-checklist.md` | Lawyer review checklist (contractor classification, platform liability, group liability, chat data, age verification, police check, cancellation, Stripe Connect, safety button, insurance, content moderation, ACL) |
| `public/legal/privacy-policy-draft.md` | Copy for app to serve at `/legal/privacy-policy-draft.md` |
| `public/legal/terms-and-conditions-draft.md` | Copy for app to serve at `/legal/terms-and-conditions-draft.md` |
| `public/legal/entertainer-contractor-agreement-draft.md` | Copy for app to serve at `/legal/entertainer-contractor-agreement-draft.md` |
| `src/pages/shared/LegalDoc.jsx` | Page that fetches and displays legal markdown for `/legal/:docType` (privacy, terms, contractor) |

### Routes added

| Route | Component | Purpose |
|-------|-----------|---------|
| `/legal/:docType` | `LegalDoc` | Renders Privacy Policy, Terms & Conditions, or Contractor Agreement from public/legal markdown |

### Firestore fields added (users collection)

| Field | When set | Description |
|-------|----------|-------------|
| `legalAcceptedAt` | New user signup (client or entertainer) | Server timestamp when user accepted Terms and Privacy Policy |
| `termsVersion` | New user signup | Version identifier (e.g. `"v1-draft"`) |
| `contractorAgreementAcceptedAt` | New entertainer signup or add entertainer profile | Server timestamp when entertainer accepted Contractor Agreement |
| `agreementVersion` | New entertainer signup or add entertainer profile | Agreement version (e.g. `"v1-draft"`) |

Existing accounts are not blocked; acceptance is required only for **new** signups (and when adding an entertainer profile to an existing account).

### UI changes

- **Client signup (Step 3):** Checkbox label updated to "I agree to the Terms & Conditions and Privacy Policy" with links to `/legal/terms` and `/legal/privacy`. Signup passes `termsVersion: "v1-draft"`; AuthContext writes `legalAcceptedAt` and `termsVersion` to user doc.
- **Talent signup (Step 5):** Checkbox label updated to "I agree to the Terms & Conditions, Privacy Policy, and Contractor Agreement" with links to `/legal/terms`, `/legal/privacy`, `/legal/contractor`. Signup passes `termsVersion` and `agreementVersion`; AuthContext writes `legalAcceptedAt`, `termsVersion`, `contractorAgreementAcceptedAt`, `agreementVersion` for new accounts. When adding entertainer profile via `addEntertainerProfile`, AuthContext writes `contractorAgreementAcceptedAt` and `agreementVersion` to user doc.
- **Settings:** Legal section links updated to `/legal/terms`, `/legal/privacy`; link to Contractor Agreement added (`/legal/contractor`).
- **Footer:** Terms and Privacy links point to `/legal/terms` and `/legal/privacy` (using React Router `Link`). Safety link points to `/help`.

---

## Phase 3.5 — BookingStatus Build Fix

Build was failing with esbuild error: **"Expected ')' but found 'this'"** around line 339 in `src/pages/shared/BookingStatus.jsx`.

### Cause

The **true branch** of the inner ternary (when `booking.arrivalCode` is set) contained **two sibling JSX elements** without a wrapper:

- `<ArrivalCodeDisplay>{booking.arrivalCode}</ArrivalCodeDisplay>`
- `<ArrivalHint>Share this 4-digit code with your entertainer when they arrive.</ArrivalHint>`

In JSX, each ternary branch must be a single expression. Two adjacent elements are two expressions, so the parser treated the second element as a new expression. The word **"this"** in the hint text was then parsed as JavaScript (`this`), which produced the "Expected ')' but found 'this'" error.

### Exact fix

Wrapped the true branch in a React fragment so it is one expression:

- **Before:** The ternary returned two siblings (ArrivalCodeDisplay, then ArrivalHint).
- **After:** The ternary returns a single fragment `<>...</>` that contains both elements.

### Lines changed

**File:** `src/pages/shared/BookingStatus.jsx`  
**Lines:** 337–341 (approx.)

- Added opening `<>` after `(booking.arrivalCode ? (`.
- Added closing `</>` before `) : (`.
- No logic or runtime behavior change; structure only.

---

## Phase 4 — Admin & Enforcement

Internal admin tools, moderation, strike/ban system, financial oversight, and audit logging. No changes to core booking or payment logic; auth and role checks extended for admin.

### Collections added

| Collection | Purpose |
|------------|--------|
| `adminLogs` / `adminLogs_dev` | Admin audit trail: action, actorId, targetId, timestamp, metadata. Written by admin actions (ban, suspend, warn, reset strikes, force cancel, balance adjust, safety update, dispute resolution, hide/restore review). |

### Firestore fields added

| Collection | Field | Description |
|------------|--------|-------------|
| users | `role` | May be `client` \| `entertainer` \| `admin` |
| users | `strikes` | Number of strikes (warn adds 1; 3 → auto suspend, 5 → auto ban) |
| users | `isSuspended`, `suspendedAt`, `suspendReason` | Set by admin or auto at 3 strikes |
| users | `isBanned`, `bannedAt`, `banReason` | Set by admin or auto at 5 strikes |
| users | `lastWarnAt`, `lastWarnReason` | Last warning from admin |
| entertainers | `strikes`, `isSuspended`, `isBanned`, `suspendedAt`, `bannedAt` | Synced from user doc when admin updates user (same uid) |
| entertainers | `balanceCents` | Running balance; negative = owes platform (e.g. cancellation fee). Block accepting new bookings when &lt; 0. |
| safetyAlerts | `resolutionStatus`, `updatedAt`, `updatedBy`, `escalated`, `adminNotes` | Admin can mark resolved, escalate, add notes |
| disputes | `status` | `pending` \| `resolved` \| `dismissed`; admin sets via Disputes page |
| ratings | `hiddenByAdmin` | Admin can hide/restore reviews |

### Routes added

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin` | Redirect to `/admin/dashboard` | Entry under RequireAdmin |
| `/admin/dashboard` | AdminDashboard | Metrics: users, entertainers, bookings, revenue, cancellations, safety alerts, disputes, bans |
| `/admin/users` | AdminUsers | List users; suspend, ban, warn, reset strikes; view profile |
| `/admin/entertainers` | AdminEntertainers | List entertainers; Stripe status, balance, strikes, reviews, verification; ban, suspend |
| `/admin/bookings` | AdminBookings | List bookings; status, client, entertainer, amounts, arrival code; force cancel |
| `/admin/reviews` | AdminReviews | List ratings; hide, restore, warn reviewer |
| `/admin/disputes` | AdminDisputes | List disputes; set status resolved/dismissed |
| `/admin/finances` | AdminFinances | List entertainers with balance, earnings sample; adjust balance (+/− $30), waive |
| `/admin/safety` | AdminSafety | List safetyAlerts; mark resolved, escalate |
| `/admin/logs` | AdminLogs | List adminLogs (audit trail) |

### Firestore rules added/updated

- **isAdmin()** helper: `hasRole('admin')`.
- **users / users_dev:** allow update if `isOwner(userId) || isAdmin()`.
- **entertainers / entertainers_dev:** allow update if `(isOwner && stripe unchanged) || isAdmin()`.
- **bookings / bookings_dev:** allow read if participant or isAdmin; allow update if participant (payment keys unchanged) or isAdmin.
- **safetyAlerts / safetyAlerts_dev:** allow read if creator or isAdmin; allow update if isAdmin.
- **disputes / disputes_dev:** allow update if isAdmin.
- **ratings / ratings_dev:** allow update if reviewee (dispute fields only) or isAdmin.
- **finances:** allow read if owner or isAdmin; allow update if isAdmin.
- **payments:** allow read if participant or isAdmin.
- **adminLogs / adminLogs_dev:** allow read, create if isAdmin; no update/delete.

### Enforcement logic

- **Admin role:** `role === "admin"` in users doc. RequireAdmin guard redirects non-admins from `/admin`. RequireClient and RequireEntertainer allow admin through (admin can access client and entertainer routes).
- **Banned users:** If `userData.isBanned` and not admin, Layout renders BannedPage (sign out only). Admins can still access `/admin` when banned.
- **Suspended/banned + messaging:** `sendMessage` reads user doc and throws if sender is suspended or banned.
- **Suspended/banned + booking accept:** AcceptBooking page blocks entertainer if userData.isSuspended or userData.isBanned.
- **Negative balance:** AcceptBooking page loads entertainer doc and blocks if `balanceCents < 0` with “Outstanding balance” message.
- **Strikes:** Admin “Warn” adds 1 strike to user (and syncs to entertainer doc). At 3 strikes, user is auto-suspended; at 5, auto-banned. Constants: STRIKES_AUTO_SUSPEND = 3, STRIKES_AUTO_BAN = 5 in useAdminUsers.js.

### UI changes

- **Layout:** Bottom nav hidden for `/admin`; when user is banned and not admin, BannedPage is shown instead of Outlet.
- **Settings:** New “Admin” section (only when isAdmin) with link to “Admin Dashboard” → `/admin/dashboard`.
- **AdminLayout:** Sidebar with links to Dashboard, Users, Entertainers, Bookings, Reviews, Disputes, Finances, Safety, Audit Logs; “← App” back link.

### Files created

| Path | Description |
|------|-------------|
| `src/lib/adminLog.js` | logAdminAction(actorId, action, targetId, metadata) for adminLogs |
| `src/hooks/useAdminUsers.js` | useAdminUsers(); adminUpdateUser, adminSuspendUser, adminBanUser, adminWarnUser, adminResetStrikes, adminUnsuspendUser, adminUnbanUser; strike auto suspend/ban |
| `src/pages/admin/AdminLayout.jsx` | Admin layout with sidebar and Outlet |
| `src/pages/admin/Dashboard.jsx` | Metrics cards (users, entertainers, bookings, revenue, cancellations, safety, disputes, bans) |
| `src/pages/admin/Users.jsx` | Users table; view, suspend, ban, warn, reset strikes |
| `src/pages/admin/Entertainers.jsx` | Entertainers table; Stripe, balance, strikes, reviews; ban, suspend |
| `src/pages/admin/Bookings.jsx` | Bookings table; force cancel |
| `src/pages/admin/Reviews.jsx` | Ratings table; hide, restore, warn reviewer |
| `src/pages/admin/Disputes.jsx` | Disputes table; set status resolved/dismissed |
| `src/pages/admin/Finances.jsx` | Entertainers + balance; adjust balance |
| `src/pages/admin/Safety.jsx` | Safety alerts table; mark resolved, escalate |
| `src/pages/admin/Logs.jsx` | Admin audit logs table |
| `src/pages/shared/BannedPage.jsx` | Full-page “Account suspended” when user is banned (non-admin) |

### Files modified

| Path | Change |
|------|--------|
| `src/context/RoleContext.jsx` | ROLES.ADMIN, isAdmin; role from userData |
| `src/components/ProtectedRoute.jsx` | RequireAdmin; RequireClient/RequireEntertainer allow role === ADMIN |
| `src/components/Layout.jsx` | useAuth, useRole; hide nav for /admin; render BannedPage when banned and not admin |
| `src/lib/collections.js` | COL.adminLogs, paths.adminLog |
| `firestore.rules` | isAdmin(); users, entertainers, bookings, safetyAlerts, disputes, ratings, finances, payments, adminLogs rules for admin |
| `src/App.jsx` | RequireAdmin; AdminLayout and admin child routes (dashboard, users, entertainers, bookings, reviews, disputes, finances, safety, logs) |
| `src/pages/shared/Settings.jsx` | Admin section with link to /admin/dashboard when isAdmin |
| `src/pages/talent/AcceptBooking.jsx` | Load entertainer doc for balanceCents; block if suspended, banned, or outstanding balance |
| `src/hooks/useMessages.js` | sendMessage checks user doc isSuspended/isBanned and throws |

### Assumptions / TODOs (Phase 4)

- **balanceCents:** Backend (Cloud Functions) should set entertainer `balanceCents` when deducting cancellation fees; admin can adjust or waive via Finances page. Initial balance can be 0 if not set.
- **Admin assignment:** No UI to set role to admin; set manually in Firestore (users/{uid}.role = "admin") or via a backend/script.
- **Force cancel / Refund:** Only “Force cancel” is implemented in admin Bookings; refund and “Mark dispute” / “Freeze booking” are placeholders for backend integration.

---

## Phase 4.5 — Admin Backend Enforcement & Firestore Automation

Backend callables and Firestore rules for admin actions; no refactor of booking/payment flows.

### New Cloud Functions (callables, region australia-southeast1)

| Function | Params | Behaviour |
|----------|--------|-----------|
| `setUserRoleCallable` | targetUid, newRole (client \| entertainer \| admin) | Caller must be admin. Updates users/{targetUid}.role; syncs entertainer doc if present. Logs to adminLogs. |
| `adminRefundBookingCallable` | bookingId, reason, refundType (full \| partial \| deposit) | Admin only. Fetches booking and Stripe PaymentIntent; creates Stripe refund. Sets booking status refunded, refund { amount, reason, at, adminId }. Logs. |
| `adminResolveDisputeCallable` | disputeId, outcome (uphold \| dismiss \| modify), notes | Admin only. Updates dispute; on uphold/modify can hide rating; on uphold adds strike to reviewer (3→suspend, 5→ban). Logs. |
| `adminFreezeBookingCallable` | bookingId, freeze (bool), reason | Admin only. Sets booking isFrozen, freezeReason, frozenAt, frozenBy. Logs. |
| `adjustEntertainerBalanceCallable` | entertainerId, deltaCents, reason | Admin only. Transaction to update entertainers.balanceCents. Logs. |
| `issueStrikeCallable` | targetUid, reason, relatedBookingId? | Admin only. Increments user strikes; 3→suspend, 5→ban; syncs to entertainer doc. Logs. |

### Firestore rule changes (Phase 4.5)

- **users / users_dev:** `userAdminOnlyUnchanged()` — only admin (or backend) can change `role`, `strikes`, `isSuspended`, `isBanned`. Owner can update other fields.
- **entertainers / entertainers_dev:** `entertainerAdminOnlyUnchanged()` — only admin (or backend) can change `balanceCents`, `strikes`, `isSuspended`, `isBanned`.
- **bookings / bookings_dev:** `bookingPaymentKeysUnchanged()` already disallows client writes to `refund`, `isFrozen`, `freezeReason`, `frozenAt`, `frozenBy`. Added `bookingStatusUnchangedWhenFrozen()`: when `isFrozen === true`, only admin can change `status`; client/entertainer updates that change status are denied.
- **adminLogs / adminLogs_dev:** `create` (and update/delete) set to `false`; only backend (Admin SDK) can write. Admins can read.

### Enforcement points

- **Role / strikes / ban / suspend:** Enforced in callables (requireAdmin) and Firestore rules (admin-only fields). Frontend: AcceptBooking blocks suspended/banned and negative balance; messaging blocks suspended/banned.
- **Refund:** Performed only via `adminRefundBookingCallable`; Stripe refund + booking status/refund object.
- **Dispute resolution:** Only via `adminResolveDisputeCallable`; rating hide/restore and strikes applied in function.
- **Booking freeze:** Set via `adminFreezeBookingCallable`. When `booking.isFrozen === true`: BookingStatus shows “Booking under review” and disables deposit pay, arrival code, safety button; AcceptBooking shows “Booking under review” and blocks accept; BookingHistory and client/talent dashboards disable Cancel and Mark Complete (button shows “Under review”). Firestore rules prevent non-admin from changing booking status when frozen.
- **Negative balance:** `adjustEntertainerBalanceCallable` uses a transaction. Frontend and backend (acceptBooking) block accept when balanceCents < 0.
- **Strikes:** Issued only via `issueStrikeCallable`; 3→suspend, 5→ban; booking/chat/login respect user flags.

### Audit logging (adminLogs)

All of the above callables write to `adminLogs` with: action, actorId, targetId, metadata, createdAt (server timestamp). Schema: adminLogs/{id} — action, actorId, targetId, metadata, createdAt. Only backend can create (Firestore rules).

### UI wiring (admin pages)

- **/admin/users:** Role dropdown calls `setUserRole`; “Warn (strike)” calls `issueStrike`. Loading/error state and refetch after actions.
- **/admin/bookings:** Refund (deposit / full), Freeze / Unfreeze call callables; table shows isFrozen and status; message/error and refetch.
- **/admin/disputes:** Uphold / Dismiss / Modify call `adminResolveDispute`; message/error and refetch.
- **/admin/finances:** Balance ±$30 call `adjustEntertainerBalance`; message/error and refetch.

### Security assumptions

- First admin is created manually (e.g. users/{uid}.role = "admin") or via a one-off script; no self-service promotion to admin.
- All sensitive admin actions go through callables; Firestore rules lock direct client writes to role, strikes, balances, bans, disputes, refund/freeze fields and adminLogs.
- Stripe, auth, and existing booking/payment flows are unchanged; only new callables and guards added.

---

## Phase 5 — Growth & Acquisition

Internal CRM-style tools for lead capture, referrals, campaigns, promotions, and attribution. No changes to booking, payment, safety, or admin enforcement logic.

### New Firestore collections

| Collection | Purpose | Rules |
|------------|---------|--------|
| `leads` | Lead capture (name, phone, email, source, city, notes, status, assignedTo, campaignId, followUpAt, marketingOptIn) | Admin read/write |
| `referrals` | referrerId, referredUserId, referralCode, rewardStatus, createdAt | Create when user signs up via ref; read by referrer/referred/admin |
| `campaigns` | name, platform, code, startDate, endDate, budget, manager, isActive | Admin read/write |
| `promotions` | title, description, bannerText, discountType, value, expiry, targetRole, active | All read when active; admin write |
| `testimonials` | userId, role, content, approved, createdAt | Read if approved or admin; create if owner; update/delete admin |

### Routes

- **Public:** `/ref/:refCode` — redirects to `/signup?ref=...&campaign=...&source=...&lead=...` for attribution.
- **Admin:** `/admin/leads` (CRM table, search, filter, status, assign, follow-up, notes, CSV export), `/admin/leads/new` (quick entry), `/admin/campaigns`, `/admin/promotions`, `/admin/referrals`. Sidebar links added; all under RequireAdmin.

### Attribution & referral flow

- **Signup:** SignupChoice passes URL params to client/talent signup links. ClientSignup and TalentSignup read `ref`, `campaign`, `source`, `lead` and pass to `signup()` as `referralCode`, `campaignId`, `signupSource`, `leadId`. Stored on user doc: `signupSource`, `referralCode`, `campaignId`, `leadId`, `referredBy` (when ref matched an entertainer refCode).
- **Referral doc:** On signup with `referralCode`, backend looks up entertainers where `refCode === referralCode`; if found, sets user `referredBy`, creates `referrals` doc (referrerId, referredUserId, referralCode, rewardStatus: pending).
- **refCode:** Generated on entertainer profile creation (useEntertainers `saveEntertainerProfile` when doc is new) via `generateRefCode()` (alphanumeric 8 chars). Stored on entertainers doc as `refCode`.

### Marketing consent

- **Signup:** Both client and talent signup include checkbox “I agree to receive promotional messages”. Stored as `marketingOptIn: boolean` on user doc.
- **Leads:** Lead create/update can set `marketingOptIn`. CSV export on `/admin/leads` is opt-in only (filtered by `marketingOptIn === true`). Respect this flag for SMS, email, and DM exports.

### In-app promotions

- **Promotions** collection: active promotions with `targetRole` (client | entertainer | both) and `expiry`. `usePromotions(targetRole)` fetches active, non-expired, role-matching promotions.
- **Display:** `PromoBanner` on Home (both), client Dashboard (client), talent Dashboard (entertainer). Shows `bannerText` or `title`.

### Growth dashboard (admin)

- **Widgets:** Leads today, leads total, leads converted, conversion rate, top source, referrals this month, referrals total. Loaded with leads and referrals collections; computed in admin Dashboard.

### Marketing templates

- **Folder:** `/marketing` with markdown: `street-outreach.md`, `dm-templates.md`, `influencer-pitch.md`, `dating-app-copy.md`, `event-partnership.md`, `venue-partnership.md`. Themes: safety, discretion, premium service, professionalism, convenience.

### Security assumptions

- Leads, campaigns, promotions (write), testimonials (approve) are admin-only. Referrals create is authenticated (signup flow). Promotions read is authenticated. No monetisation or investor tooling in this phase.

---

## Phase 6 — Apple-Compliant Monetisation

Simple monetisation: $2 AUD signup/verification fee (Apple IAP), $30 AUD booking platform fee (Stripe). No subscriptions or premium tiers.

### Business model

- **Signup / verification fee:** $2 AUD via Apple In-App Purchase (non-consumable). Product ID: `knockers.verification.fee`. Required to unlock booking, posting, messaging; admins can waive.
- **Booking platform fee:** $30 AUD per booking via Stripe (included in deposit PaymentIntent). All real-world service payments use Stripe.

### Policies (policies.js)

- **FEES:** `signupVerification: 200` (cents), `bookingPlatform: 3000` (cents). **VERIFICATION_FEE_DOLLARS**, **PLATFORM_FEE_DOLLARS** for display. CANCELLATION_POLICY.platformFeeCents uses FEES.bookingPlatform.

### IAP flow

- **Product:** Create in App Store Connect: `knockers.verification.fee`, $2 AUD, non-consumable.
- **After purchase:** App sends receipt to **verifyIAPReceiptCallable**; backend validates with Apple, then sets `users/{uid}.verificationFeePaid = true`, `verifiedAt`, `iapReceipt`, and writes to **fees** collection (type `signup_iap`, provider `apple`).
- **Validation:** Cloud Function **verifyIAPReceiptCallable** calls Apple verifyReceipt (production then sandbox if 21007); requires **APPLE_IAP_SHARED_SECRET**. Rejects if product is not `knockers.verification.fee`.
- **Android/Web:** No IAP on web; user is directed to pay in the iOS app or contact support. Admin can waive (verificationFeeWaivedBy).

### Enforcement

- **Firestore rules:** `hasVerification()` — user can create bookings, listings, userPosts, or booking messages only if `verificationFeePaid === true` or `verificationFeeWaivedBy` is set (or isAdmin). User doc fields `verificationFeePaid`, `verifiedAt`, `iapReceipt`, `verificationFeeWaivedBy` are admin/backend-only (userAdminOnlyUnchanged).
- **Frontend:** `canUsePaidFeatures(userData)` gates: BookingRequest, CreateListing, AcceptBooking, sendMessage. Redirect or error to Settings → Verification if not verified.

### Fee accounting (fees collection)

- **Schema:** type (`signup_iap` | `booking_stripe`), userId, bookingId (null for IAP), amountCents, provider (`apple` | `stripe`), referenceId, createdAt.
- **Writes:** IAP success in verifyIAPReceiptCallable; Stripe success in **payment_intent.succeeded** webhook (one fee doc per booking with PLATFORM_FEE_CENTS). Rules: only backend can create; admin can read.

### Revenue dashboard (admin)

- **Metrics:** IAP revenue, Stripe revenue, Total revenue (from **fees** collection aggregates). Shown in /admin/dashboard.

### Refunds

- **IAP:** Handled in App Store Connect; no server sync required for refund status unless needed later.
- **Stripe:** Handled by existing **adminRefundBookingCallable**; booking status and refund object updated; no change to fee record (revenue already recorded).

### Transparency and receipts

- **UI copy:** "Verification fee: $2 (Apple)" and "Platform fee: $30" shown in verification page and deposit flow. No misleading wording.
- **Receipts:** Verification (IAP) receipt stored on user; **Settings → Receipts** shows verification status and note that booking receipts come from Stripe by email.

### Compliance guards

- No direct Stripe for signup/verification fee (only Apple IAP for that). No external payment links or "pay outside app" prompts for the fee; UI states "Do not pay outside the app" for verification. Terms already prohibit arranging payments outside the platform.

### Security assumptions

- Apple IAP shared secret is set (e.g. APPLE_IAP_SHARED_SECRET or Firebase config apple.iap_shared_secret). First admin can waive verification for test accounts.
