# Knockers App — Canonical Metadata

These values are **authoritative and locked**. Never change, invent, or override them.

| Field | Value |
|-------|-------|
| **App Name** | Knockers |
| **Bundle ID** | `com.knockers.app` |
| **SKU** | `knockers-ios-v1` |
| **Apple App ID** | `6757728823` |

## Tech Stack

- **Frontend**: React (Vite)
- **Mobile Wrapper**: Capacitor (iOS first-class)
- **Backend**: Firebase (Auth, Firestore, Functions, Storage)
- **Subscriptions**: Apple In-App Purchases via RevenueCat
- **Payouts**: Stripe Connect (marketplace payouts only — NOT for iOS subscriptions)
- **Target iOS**: 15+

## Critical Constraints

1. **iOS subscriptions MUST go through Apple IAP** — RevenueCat is the integration layer
2. **RevenueCat is the source of truth** for entitlement state (Firestore is a cache)
3. **Stripe MUST NOT be used for iOS subscription purchase flows** — Apple Review will reject
4. **Stripe Connect is allowed ONLY for**: marketplace payouts, off-platform services
5. **Never suggest workarounds to bypass Apple fees**

## When Debugging

1. Identify the failing layer (JS / Capacitor bridge / native iOS / Firebase / RevenueCat / App Store Connect)
2. State root cause with evidence
3. Provide deterministic fix — no "try clearing cache" advice
