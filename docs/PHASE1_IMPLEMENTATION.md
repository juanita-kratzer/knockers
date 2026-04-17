# Phase 1 Implementation Spec: Stripe Connect + Deposit Escrow + Release + Cancellation Fees

## Branch plan (tasks in order)

1. **Foundation**
   - [x] Add `docs/PHASE1_IMPLEMENTATION.md` (this file)
   - [x] Add Firestore schema doc and migration strategy (`docs/PHASE1_FIRESTORE_SCHEMA.md`)
   - [x] Add Cloud Functions project (`functions/`) with Stripe SDK, TypeScript
   - [x] Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ENABLED`; Firestore suffix for dev

2. **Stripe Connect (entertainer payouts)**
   - [ ] Cloud Function: `createConnectAccount` (callable)
   - [ ] Cloud Function: `getConnectOnboardingLink` (callable)
   - [ ] Firestore: add `entertainers.stripe` (connectAccountId, onboardingStatus, chargesEnabled, payoutsEnabled, detailsSubmitted)
   - [ ] Frontend: “Set up payouts” banner + button; call callables; redirect to AccountLink

3. **Deposit payment**
   - [ ] Firestore: add `bookings.paymentStatus`, `bookings.stripe`, `bookings.payout`, `bookings.cancellation` (see schema below)
   - [ ] Cloud Function: `createDepositPaymentIntent(bookingId)` (callable) — validate client, DEPOSIT_PENDING, create PI, save paymentIntentId, return clientSecret (do not store clientSecret)
   - [ ] Cloud Function: Stripe webhook `payment_intent.succeeded` → update booking paymentStatus + status DEPOSIT_PAID
   - [ ] Firestore rules: clients cannot write `paymentStatus` or `stripe.*`; only server

4. **Payout on completion**
   - [ ] Cloud Function: `releasePayoutOnCompletion(bookingId)` (callable) — validate entertainer, COMPLETED, DEPOSIT_PAID, Transfer to connect account, save transferId

5. **Cancellation with fees**
   - [ ] Cloud Function: `cancelBookingWithFees(bookingId, cancelledBy)` (callable) — apply rules (<72h full, >72h $80; entertainer cancel = refund + strike, no charge in Phase 1)
   - [ ] Idempotency: Stripe idempotency key `action:bookingId:version`; Firestore transaction per action

6. **Frontend**
   - [ ] Feature flag: `VITE_STRIPE_ENABLED` (default false); when true, use callables + Stripe Elements
   - [ ] BookingStatus / deposit flow: rules modal → cancellation policy modal → PaymentElement; “Payment processing…” until webhook
   - [ ] Entertainer: block accept or show “Set up payouts” if not onboarded

7. **Webhook + security**
   - [ ] HTTPS function `stripeWebhook`; verify signature; handle `payment_intent.succeeded` / `payment_intent.payment_failed`
   - [ ] Firestore rules: no client write to `stripe`, `paymentStatus`, `payout`; read allowed for own booking

8. **Audit**
   - [ ] Optional: `payments` collection (bookingId, type, amountCents, stripeRefs, status, createdAt) for audit trail

---

## Firestore schema changes (minimal, safe defaults)

### `bookings` / `bookings_dev`

**New fields (all optional for backward compatibility):**

| Field | Type | Default | Set by |
|-------|------|--------|--------|
| `paymentStatus` | string | `"UNPAID"` | Server only |
| `stripe.paymentIntentId` | string | - | Server |
| `stripe.chargeId` | string | - | Server |
| `stripe.transferId` | string | - | Server |
| `stripe.refundId` | string | - | Server |
| `stripe.connectedAccountId` | string | - | Server |
| `stripe.amountDepositCents` | number | - | Server |
| `stripe.amountPlatformFeeCents` | number | 3000 | Server |
| `stripe.amountTotalCents` | number | - | Server |
| `payout.eligibleAt` | timestamp | - | Server |
| `payout.releasedAt` | timestamp | - | Server |
| `payout.amountToEntertainerCents` | number | - | Server |
| `cancellation.cancelledBy` | string | - | Server |
| `cancellation.cancelledAt` | timestamp | - | Server |
| `cancellation.feeCents` | number | - | Server |
| `cancellation.entertainerCompCents` | number | - | Server |
| `cancellation.platformFeeCents` | number | - | Server |
| `cancellation.stripeChargeOutcome` | string | - | Server |

**Migration:** No migration script. Existing docs have no `paymentStatus` → treat as `UNPAID`. New server logic only writes these fields when Stripe is used.

### `entertainers` / `entertainers_dev`

**New fields:**

| Field | Type | Default | Set by |
|-------|------|--------|--------|
| `stripe.connectAccountId` | string | - | Server |
| `stripe.onboardingStatus` | "NONE" \| "PENDING" \| "COMPLETE" | "NONE" | Server |
| `stripe.chargesEnabled` | boolean | false | Server |
| `stripe.payoutsEnabled` | boolean | false | Server |
| `stripe.detailsSubmitted` | boolean | false | Server |

### `payments` / `payments_dev` (optional audit)

| Field | Type |
|-------|------|
| bookingId | string |
| userId | string (client) |
| entertainerId | string |
| type | "DEPOSIT" \| "CANCELLATION_FEE" \| "REFUND" \| "PAYOUT" |
| amountCents | number |
| stripeRefs | map |
| status | string |
| createdAt | timestamp |

---

## Idempotency

- **Stripe:** Every PI create / Transfer / Refund use `idempotencyKey: \`${action}:${bookingId}:${timestampOrVersion}\`` (e.g. `deposit:booking123:1` or hash of booking state).
- **Firestore:** Use `runTransaction` for: “create PI and set paymentIntentId”, “webhook set DEPOSIT_PAID”, “release payout and set transferId”. Check current state before applying (e.g. if already DEPOSIT_PAID, skip).

---

## Open questions (resolved)

1. **Full booking charged <72h when only deposit exists today**  
   **Recommendation:** In Phase 1, treat “full” as “deposit already paid = no refund; optionally charge additional cancellation amount (totalAmount − deposit) via a new PaymentIntent if totalAmount > deposit”. If totalAmount not yet collected (deposit-only), charge a single “cancellation fee” PaymentIntent for the full booking amount (totalAmount) when client cancels <72h. So: one PaymentIntent for deposit+platform at accept; if cancel <72h, create a second PaymentIntent for (totalAmount - deposit) or full totalAmount depending on what was already charged. Simplest: **<72h cancel = charge full totalAmount (one PaymentIntent at cancel time if deposit wasn’t taken, or charge remainder if deposit was taken).** Implement “charge remainder” in Phase 1 so data model supports it.

2. **Store clientSecret?**  
   **No.** Return `clientSecret` from `createDepositPaymentIntent` to the client only; client uses it with Stripe.js once. Do not persist in Firestore.

3. **Entertainer $30 penalty on cancel**  
   **Phase 1:** Do not charge entertainer automatically (no payment method on file). Record strike (e.g. `strikes` subcollection or field on user/entertainer) and show in dashboard; document “manual billing” or future Connect debit. Payout is simply not sent; platform keeps $30 from deposit if already collected, and refund rest to client.

---

## Files to create/modify

### New

- `docs/PHASE1_IMPLEMENTATION.md` (this file)
- `functions/package.json`
- `functions/tsconfig.json`
- `functions/src/index.ts` (exports callables + webhook)
- `functions/src/stripe/connect.ts` (createConnectAccount, getConnectOnboardingLink)
- `functions/src/stripe/deposit.ts` (createDepositPaymentIntent)
- `functions/src/stripe/webhook.ts` (stripeWebhook, confirmDepositPaid logic)
- `functions/src/stripe/payout.ts` (releasePayoutOnCompletion)
- `functions/src/stripe/cancel.ts` (cancelBookingWithFees)
- `functions/src/lib/firestore.ts` (admin db, collection names with suffix)
- `functions/src/lib/idempotency.ts` (idempotency key helper)
- `.env.functions.example` (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc.)

### Modify

- `firebase.json` — add `"functions": { "source": "functions", "predeploy": ["npm run build"] }`
- `firestore.rules` — add rules so only server can write `paymentStatus`, `stripe`, `payout`, `cancellation` on bookings; entertainers `stripe` server-only
- `src/hooks/useBookings.js` — keep existing; add optional `useCallable` for createDepositPaymentIntent when flag on
- `src/pages/shared/BookingStatus.jsx` — when DEPOSIT_PENDING and flag on: rules + policy modals → Stripe Elements; “Payment processing…” state
- `src/context` or `src/lib` — feature flag `isStripeEnabled()` from `VITE_STRIPE_ENABLED`
- Entertainer dashboard or Finances — “Set up payouts” banner; call createConnectAccount / getConnectOnboardingLink

---

## Test plan (high level)

| Scenario | Expected |
|----------|----------|
| Deposit deadline expires | Booking stays DEPOSIT_PENDING; no charge; entertainer can withdraw |
| Payment succeeds, webhook delayed | Client sees “Payment processing…”; when webhook runs, booking → DEPOSIT_PAID |
| Duplicate webhook events | Idempotent: second event no-op (already DEPOSIT_PAID) |
| Entertainer not onboarded | Accept sets deposit but payout blocked; UI shows “Set up payouts” |
| Client cancel after deposit paid, >72h | Refund deposit minus $80; charge $80 (or keep $80 from refund); $50 to entertainer, $30 platform |
| Client cancel before deposit paid | No charge; booking cancelled |
| Entertainer cancel | Refund client deposit; record strike; no Transfer; $30 platform kept if already in platform account |

---

## Env and rollout

- **Functions:** Use test keys; set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and optionally `STRIPE_ENABLED`, `APP_URL` in Firebase config or `functions/.env` for emulator. See `functions/.env.example`.
- **App:** `VITE_STRIPE_ENABLED=true` to turn on Stripe UI and callables; `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` for Stripe Elements (PaymentElement). Without these, Stripe flow is hidden and existing mock flow is used.
- **Firestore suffix:** Functions use `_dev` when `FUNCTIONS_EMULATOR=true` or `NODE_ENV=development` so dev and prod data are separated.
- **Webhook:** The Stripe webhook endpoint needs the raw request body for signature verification. The handler uses `preserveRawBody` in `runWith`; if your deployment does not support it, use Stripe CLI forwarding or a different host that preserves raw body.
