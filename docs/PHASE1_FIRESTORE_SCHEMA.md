# Phase 1 Firestore schema additions

Safe defaults: all new fields are optional. Existing documents remain valid.

## Collection: `bookings` (or `bookings_dev`)

```text
paymentStatus: "UNPAID" | "PAYMENT_INTENT_CREATED" | "DEPOSIT_AUTHORIZED" | "DEPOSIT_PAID" | "REFUNDED" | "CANCELLED_CHARGED" | "PAYOUT_SENT"

stripe: {
  paymentIntentId: string,
  chargeId: string,
  transferId: string,
  refundId: string,
  connectedAccountId: string,
  amountDepositCents: number,
  amountPlatformFeeCents: number,   // 3000
  amountTotalCents: number
}

payout: {
  eligibleAt: Timestamp,
  releasedAt: Timestamp,
  amountToEntertainerCents: number
}

cancellation: {
  cancelledBy: "CLIENT" | "ENTERTAINER",
  cancelledAt: Timestamp,
  feeCents: number,
  entertainerCompCents: number,
  platformFeeCents: number,
  stripeChargeOutcome: "CHARGED" | "REFUNDED" | "NO_ACTION"
}
```

- **clientSecret:** Do not store. Return from `createDepositPaymentIntent` at call time only.

## Collection: `entertainers` (or `entertainers_dev`)

```text
stripe: {
  connectAccountId: string,
  onboardingStatus: "NONE" | "PENDING" | "COMPLETE",
  chargesEnabled: boolean,
  payoutsEnabled: boolean,
  detailsSubmitted: boolean
}
```

## Collection: `payments` (or `payments_dev`) — audit

```text
bookingId: string
userId: string
entertainerId: string
type: "DEPOSIT" | "CANCELLATION_FEE" | "REFUND" | "PAYOUT"
amountCents: number
stripeRefs: { paymentIntentId?, transferId?, refundId? }
status: string
createdAt: Timestamp
```

## Migration strategy

- No batch migration. Default in code: if `paymentStatus` is missing, treat as `UNPAID`.
- Server (Cloud Functions) is the only writer for `paymentStatus`, `stripe`, `payout`, `cancellation` on bookings and `stripe` on entertainers.
- Security rules must deny client/entertainer write to these paths; allow read for own booking/own entertainer doc.
