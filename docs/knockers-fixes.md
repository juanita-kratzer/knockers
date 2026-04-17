# Knockers Fixes & Improvements Report

This document summarizes changes made per the Cursor prompt: navigation/UI fixes, settings routes, FAQ rewrites, profile/booking flows, layout, and validation. Existing auth, bookings, payments, profiles, and chat flows were preserved.

---

## 1. Routes added

| Route | Component | Purpose |
|-------|-----------|---------|
| `/settings/notifications` | NotificationsPage | Notifications settings (placeholder) |
| `/settings/payment-methods` | PaymentMethodsPage | Payment methods (placeholder) |
| `/settings/bank` | BankDetailsPage | Bank details (placeholder) |
| `/settings/emergency-contact` | EmergencyContactPage | Emergency contact (placeholder) |
| `/settings/share-profile` | ShareProfilePage | Entertainer profile link + copy |
| `/settings/referral` | ReferralPage | Refer entertainers (placeholder) |
| `/saved/entertainers` | SavedEntertainersPage | User saved entertainers |
| `/saved/clients` | SavedClientsPage | Entertainer saved clients |
| `/blocked/entertainers` | BlockedEntertainersPage | User blocked entertainers |
| `/blocked/clients` | BlockedClientsPage | Entertainer blocked clients |
| `/profile/public/:id` | Redirect | Redirects to `/talent/:id` (public profile) |
| `*` (catch-all) | NotFoundPage | 404 fallback |

All of the above are wrapped with `RequireAuth` where appropriate. Contact Us remains at `/contact`.

---

## 2. Pages created

- **NotificationsPage** – `/settings/notifications` (placeholder copy)
- **SavedEntertainersPage** – `/saved/entertainers` (empty state)
- **SavedClientsPage** – `/saved/clients` (empty state)
- **BlockedEntertainersPage** – `/blocked/entertainers` (empty state)
- **BlockedClientsPage** – `/blocked/clients` (empty state)
- **PaymentMethodsPage** – `/settings/payment-methods` (placeholder)
- **BankDetailsPage** – `/settings/bank` (placeholder)
- **EmergencyContactPage** – `/settings/emergency-contact` (placeholder)
- **ShareProfilePage** – `/settings/share-profile` (entertainer: shows public profile URL + copy button)
- **ReferralPage** – `/settings/referral` (placeholder)
- **SettingsSubPage** – Reusable wrapper (back button, title, optional empty message)
- **NotFoundPage** – 404 with back button and “Go to Home” link

---

## 3. Settings navigation fixes

- **Notifications** → `/settings/notifications` (route and page added).
- **Saved entertainers** → `/saved/entertainers` (client); **Saved clients** → `/saved/clients` (entertainer). Settings links updated.
- **Booking history** → `/bookings/history` (unchanged; already correct).
- **Blocked entertainers** → `/blocked/entertainers` (client); **Blocked clients** → `/blocked/clients` (entertainer). Settings links updated.
- **Contact Us** → `/contact`; **Contact** page now uses `PageContainer` and `PageHeader` with **back button**.
- Entertainer-only items (Public profile link, Notifications, Saved clients, Booking history, Blocked clients, Payment method, Bank details, Emergency contact, Profile link, Refer entertainer) point to the routes above or existing routes; placeholders created where needed.

---

## 4. FAQ changes

### User (client) FAQ

- **Added:** “Entertainer didn’t show up” (no refund if entertainer proves arrival + contact attempts).
- **Removed from platform fee:** ASAP fee, travel fee (copy now only mentions $30 booking fee).
- **Refund section:** Explains entertainers are independent contractors; no refunds without proof.
- **Removed:** Standalone “Safety button”, “What if I feel unsafe”, “What if a client misbehaves”.
- **Added – Safety Precautions:** Soft/Hard profiles, Safety button, Location sharing, Start/End booking verification codes, Recommend sharing location with a friend.
- **Added:** “What gets me banned?” (both sides).

### Entertainer FAQ

- **Added/updated:** What if user cancels; No response after arrival (15 min → location proof, full deposit – $30); Personal info (no sharing before deposit); Cancellation policy (user cancels, entertainer cancels → $30 fee + refund, repeated cancellations → flag/blacklist).
- **Replaced refund question** with: “What if client lied / fake event / fake guests?” plus booking form warning (if user lies, entertainer may refuse without refund).
- **Added:** “What gets me banned?” (both sides).
- **Replaced:** “How do I make a payment” → “How do I receive my payment”.
- **Added:** $30 cancellation fee system (cancel → payment screen; if unpaid → block new bookings; Finance shows -$30 balance).

FAQ page uses **useRole()** to show **FAQ_USER** or **FAQ_ENTERTAINER**; contact CTA links to `/contact`.

---

## 5. Validation rules (listings)

- **CreateListing** (client post listing):
  - **Blocked in title and description:** phone numbers (regex: 8+ digits / common patterns), email addresses (regex), @handles (e.g. @username).
  - **Auto-check on submit:** `containsBlockedContent()` runs on title and description; if match, submit is blocked and an error message is shown.
  - **In-form warning:** Short copy telling users not to include phone, email, or @handles and to use the app to message.

Regexes used: `PHONE_REGEX`, `EMAIL_REGEX`, `HANDLE_REGEX` in `CreateListing.jsx`.

---

## 6. Layout fixes

- **Browse (Explore) categories:** Category filter chips no longer rely on horizontal scroll only; **flex-wrap: wrap** and **gap** so chips wrap and don’t overlap. Comment added that category titles come from entertainerTypes.
- **Map (Home) filter:** Filter control **opens a dropdown** (state `showFilterDropdown`) instead of redirecting to browse. Dropdown contains “Browse all entertainers” link to `/explore`. No redirect on filter button click.

---

## 7. Profile & booking flows

- **Profile – Bookings made / Repeat entertainers:** For clients, both stats are **clickable** and link to **`/bookings/history`** (same page, can show empty placeholder when no bookings). Implemented with `StatLink` (styled `Link`) in `Profile.jsx`.
- **Booking history:** Still served by **ClientDashboard** at `/bookings/history`. Ordering by `completedAt` and pagination can be added later (may require Firestore composite index); not changed in this pass.

---

## 8. Entertainer bottom nav (Listings restored)

- **BottomNav (entertainer):** First tab is **“Listings”** linking to **`/listings`** (TalentListings page — browse client job listings and apply). This was briefly changed to Public Profile; reverted per product request.
- Route **`/profile/public/:id`** still exists and redirects to `/talent/:id` for direct links or Settings “Your Profile Link” if needed.

---

## 9. 404 fallback

- **Catch-all route** `path="*"` added; renders **NotFoundPage** (back button + “Go to Home” link to `/`).

---

## 10. Files touched (summary)

- **App.jsx** – New routes, lazy imports, `PublicProfileRedirect`, Navigate/useParams, 404 route.
- **Settings.jsx** – Links to `/saved/entertainers`, `/saved/clients`, `/blocked/entertainers`, `/blocked/clients`.
- **Contact.jsx** – Wrapped in PageContainer + PageHeader with back button.
- **FAQ.jsx** – Rewritten; role-based FAQ_USER / FAQ_ENTTAINER.
- **Profile.jsx** – Client stats “Bookings made” and “Repeat entertainers” link to `/bookings/history` (StatLink).
- **BottomNav.jsx** – Entertainer first tab: Public profile (`/profile/public/:uid`) instead of Listings; UserCircle icon.
- **Home.jsx** – Map filter opens dropdown (state + FilterWrap/Dropdown); no redirect on filter click.
- **ExplorePage.jsx** – Categories: flex-wrap + gap to fix overlap; comment for category titles.
- **CreateListing.jsx** – Validation (phone/email/handles), warning copy, `containsBlockedContent()`.
- **New files:** NotificationsPage, SavedEntertainersPage, SavedClientsPage, BlockedEntertainersPage, BlockedClientsPage, PaymentMethodsPage, BankDetailsPage, EmergencyContactPage, ShareProfilePage, ReferralPage, SettingsSubPage, NotFoundPage.

---

## 11. Remaining TODOs

- **Account verification before publishing listing:** “Require account verification before publishing” was not implemented. Needs product decision (e.g. email verified, phone, or ID). Could gate `CreateListing` on `user.emailVerified` or a custom `userData.verified` flag.
- **Booking history query:** Order by `completedAt` and pagination for past bookings may require a Firestore composite index and hook changes; left for a follow-up.
- **Help Centre dropdowns:** Help page was not changed to expandable sections; prompt mentioned “Help Centre dropdowns” – can be added later if desired.
- **Saved/Blocked lists:** Pages are placeholders with empty states. Hooking up real favorites and blocked users from Firestore is a separate task.
- **Notifications / Payment methods / Bank / Emergency contact / Referral:** Currently placeholder content; backend and UI can be added incrementally.

---

## 12. What was not changed

- Auth, login, signup, role switching.
- Booking flow (request, accept, deposit, complete, cancel).
- Stripe and Firebase logic.
- Chat/Inbox and conversation flow.
- Existing APIs and Firestore rules.
- Client Dashboard (bookings + listings) aside from profile links to it.
- Talent dashboard, Activity, Finances, Edit Profile.
- Public profile page (`/talent/:id`).

All changes are commented in code where relevant (e.g. “per knockers-fixes”, “knockers-fixes rewrite”).
