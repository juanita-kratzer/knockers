# Phase 7 — Final QA Checklist (Pre–App Store)

Run through this list before submitting to App Store. Mark each item when verified.

---

## 1. Signup

- [ ] **Client signup:** Can complete client signup; Terms and Privacy links work; consent and terms version stored.
- [ ] **Entertainer signup:** Can complete entertainer signup; contractor agreement and Terms/Privacy linked; both roles and entertainer profile created.
- [ ] **Verification fee gate:** After signup, user is prompted or directed to pay verification fee (IAP) before using messaging/bookings/listings (or sees clear “verified” state if already paid/waived).

---

## 2. IAP (Verification fee)

- [ ] **Verification screen:** Settings → Verification shows $2 (or correct amount) and explains Apple IAP.
- [ ] **Purchase flow:** On iOS, IAP completes and receipt is sent to backend; user is marked verified.
- [ ] **Receipts:** Settings → Receipts shows verification fee as paid (and Apple receipt note where applicable).
- [ ] **No Stripe for unlock:** Verification/unlock is only via IAP or admin waive; no Stripe for digital unlock.

---

## 3. Booking

- [ ] **Request:** Client can request a booking (date, time, location, notes); validation and content blocking (e.g. no phone/email in notes) work.
- [ ] **Accept:** Entertainer can accept and set deposit + total; client sees deposit + $30 platform fee clearly.
- [ ] **Payment:** Client can pay deposit + fee via Stripe (if Stripe enabled); payment success updates booking status.
- [ ] **Chat:** Chat unlocks after deposit paid; messages send and receive; no console errors in production build.
- [ ] **Completion:** Client/entertainer can mark booking complete; payout (if Stripe) behaves as configured.

---

## 4. Safety

- [ ] **Safety button:** Visible for entertainer in conversation/booking view when booking is deposit-paid or in progress; tapping triggers alert (and emergency contact is notified if set).
- [ ] **Emergency contact:** Settings → Emergency Contact; if not set, safety button prompts user to set it.
- [ ] **Block:** Blocked list in Settings; blocked users cannot message or appear as expected.

---

## 5. Cancellation

- [ ] **Client cancel:** Cancellation policy (e.g. 72h window, fees) is clear; cancel flow applies correct fees/refunds.
- [ ] **Entertainer cancel:** Entertainer can cancel; client refund and entertainer fee/balance (e.g. $30) behave as per policy.
- [ ] **Refunds:** Admin can issue refunds (Admin → Bookings); refund flow completes without errors.

---

## 6. Review / ratings

- [ ] **Submit rating:** After a completed booking, client/entertainer can submit a star rating and review.
- [ ] **Anonymity:** Review is hidden for 7 days (or configured period) then visible.
- [ ] **Disputes:** User can dispute a review; admin can see and resolve disputes (Admin → Disputes).

---

## 7. Admin actions

- [ ] **Ban/suspend:** Admin can ban or suspend a user; banned user sees Banned page and cannot send messages or accept bookings.
- [ ] **Strikes:** Strike flow (if used) updates user/entertainer; auto-ban at threshold if configured.
- [ ] **Admin log:** Sensitive actions (e.g. ban, role change, refund) are logged (Admin → Logs or equivalent).

---

## 8. Legal and disclosure

- [ ] **Terms:** Settings → Terms opens Terms & Conditions (final, no “DRAFT” badge).
- [ ] **Privacy:** Settings → Privacy opens Privacy Policy (final, no “DRAFT” badge).
- [ ] **Contractor:** Settings (or signup) links to Contractor Agreement (final, no “DRAFT” badge).
- [ ] **Fees in UI:** $2 verification and $30 booking fee are stated where relevant (Verification page, booking flow, FAQ, Receipts).

---

## 9. Production hygiene

- [ ] **No console in production:** Production build has no console.log/warn/error output (all wrapped in dev-only logger).
- [ ] **No test credentials in app:** No hardcoded passwords or test account details in shipped app or public repo.
- [ ] **Favicon / app icon:** Web favicon loads (e.g. /logo.png); iOS app icon set has required asset (e.g. 1024×1024).
- [ ] **Build:** `npm run build` succeeds; iOS build (Capacitor) succeeds.

---

## 10. App Store–specific

- [ ] **Test account:** Single test account can act as both client and entertainer; “Setup full test account” in Settings works for that account only.
- [ ] **Review notes:** App Store Connect → App Review Information includes test account credentials and instructions (see `docs/APPLE_REVIEW_NOTES.md`).
- [ ] **Privacy URL:** App Store Connect has a live Privacy Policy URL matching in-app policy.
- [ ] **Metadata:** App name, description, and keywords match in-app and comply with guidelines (see `docs/STORE_METADATA_AUDIT.md`).

---

*Complete this checklist for the build you intend to submit. Sign off and date when ready for submission.*
