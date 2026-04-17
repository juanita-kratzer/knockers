# Knockers

Two-sided marketplace for booking entertainers and event equipment in Australia. Clients browse a map, request entertainers, pay a deposit via Stripe escrow, and chat. Entertainers accept bookings, set deposits, and receive payouts on completion. Platform keeps a $30 fee per booking.

See [PROJECT_MEMORY.md](./PROJECT_MEMORY.md) for detailed architecture, phase history, and resume context.

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 7, React Router 7, styled-components, Lucide icons |
| Auth & data | Firebase Auth (email/password), Firestore |
| Storage | Firebase Storage |
| Backend | Firebase Cloud Functions (Node 20, TypeScript), region `australia-southeast1` |
| Payments | Stripe Connect Express (separate charges and transfers — escrow) |
| Maps | Google Maps API, Australian suburb data + boundary polygons |
| Mobile | Capacitor 7 (iOS build present, web-first) |

## Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project (default: `knockers-c5e30`)
- A Stripe account with Connect enabled (for payments)

## Setup

```bash
# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..

# Copy env template and fill in your keys
cp .env.example .env
cp functions/.env.example functions/.env
```

### Environment variables

**Root `.env`** (Vite frontend):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase config |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase config |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase config |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Google Maps |
| `VITE_STRIPE_ENABLED` | For payments | `true` to enable Stripe UI |
| `VITE_STRIPE_PUBLISHABLE_KEY` | When Stripe on | `pk_test_...` |
| `VITE_SKIP_IDENTITY_VERIFICATION` | Dev only | `true` to bypass verification gate |

**`functions/.env`** (Cloud Functions):

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | For payments | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | For payments | `whsec_...` |
| `APP_URL` | For Connect links | e.g. `https://yourapp.web.app` |

## Development

```bash
# Start dev server (port 5174)
npm run dev

# With Firebase emulators (optional)
# Set VITE_USE_EMULATORS=true in .env first
firebase emulators:start
```

Dev mode uses `_dev` suffixed Firestore collections (`users_dev`, `bookings_dev`, etc.) to isolate from production data.

## Deploy

### Cloud Functions

```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
```

### Firestore rules

```bash
firebase deploy --only firestore:rules
```

### Frontend (hosting)

```bash
# Staging
npm run deploy:staging

# Production
npm run deploy:prod
```

### Stripe webhook

After deploying functions, register this URL in Stripe Dashboard:

```
https://australia-southeast1-knockers-c5e30.cloudfunctions.net/stripeWebhook
```

Events to subscribe: `payment_intent.succeeded`, `payment_intent.payment_failed`, `identity.verification_session.verified`, `identity.verification_session.requires_input`, `account.updated`, `capability.updated`.

Set the signing secret as `STRIPE_WEBHOOK_SECRET` in `functions/.env` and redeploy functions.

## Project structure

```
src/
  components/     UI components (Layout, BottomNav, BookNowForm, etc.)
  context/        AuthContext, RoleContext
  hooks/          Firestore hooks (useBookings, useEntertainers, useMessages, etc.)
  lib/            Utilities (collections, featureFlags, stripeCallables, policies, etc.)
  pages/
    admin/        Admin dashboard (15 pages)
    client/       Client pages (dashboard, booking request, explore, listings)
    talent/       Entertainer pages (dashboard, finances, accept booking, etc.)
    shared/       Shared pages (profile, settings, inbox, help, etc.)
  data/           Entertainer categories, suburb data
  utils/          Geo utilities

functions/
  src/
    stripe/       connect.ts, deposit.ts, payout.ts, cancel.ts, webhook.ts, identity.ts
    lib/          config.ts, admin.ts, idempotency.ts
    iap/          apple.ts (IAP receipt validation)
    index.ts      All callable + HTTP function exports
```

## Payment flow (escrow)

1. Client requests booking, entertainer accepts and sets deposit
2. Client pays deposit + $30 platform fee via Stripe PaymentIntent
3. Funds held on platform account (no automatic transfer)
4. Stripe webhook confirms payment, booking unlocks chat
5. On completion, `payout.ts` transfers deposit only to entertainer's Connect account
6. Platform retains the $30 fee

## Current status

Phase 1 (Payments & Trust) is code-complete. Stripe keys need to be configured and functions deployed for end-to-end testing. See PROJECT_MEMORY.md for the full roadmap and testing checklist.
