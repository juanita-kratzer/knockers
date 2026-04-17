// Shared FAQ data arrays used by Help Centre and standalone FAQ page

export const FAQ_USER = [
  {
    id: "booking",
    title: "Booking",
    questions: [
      { q: "How do bookings work?", a: "You browse entertainers, select one, and submit a booking request with your event details. The entertainer reviews your request and can accept or decline. If accepted, you'll receive the deposit amount and have 10 minutes to pay and confirm the booking." },
      { q: "How much is the deposit?", a: "The deposit amount is set by the entertainer when they accept your booking. It's typically 50% of the total, plus our $30 booking fee. The remaining balance is paid after the booking is completed." },
      { q: "Entertainer didn't show up", a: "If the entertainer proves they arrived and attempted to contact you, no refund is given. If they did not arrive and did not communicate, you can report the no-show and we will review for a refund." },
      { q: "Can I message entertainers before booking?", a: "You can send an enquiry through their profile, but direct messaging is only available after a booking is confirmed and deposit is paid. This protects both parties." },
    ],
  },
  {
    id: "cancellation",
    title: "Cancellation & Refunds",
    questions: [
      { q: "What's the cancellation policy?", a: "If you cancel within 72 hours of your event, you'll be charged the full booking fee. If you cancel outside 72 hours, there's an $80 cancellation fee ($50 goes to the entertainer). Our $30 booking fee is non-refundable." },
      { q: "What if the entertainer cancels?", a: "If an entertainer cancels, you receive a full refund of your deposit. The entertainer pays a $30 cancellation fee." },
      { q: "Refunds", a: "Entertainers are independent contractors. We do not offer refunds without proof of a breach (e.g. no-show with no contact). Disputes are reviewed case-by-case with evidence." },
    ],
  },
  {
    id: "payment",
    title: "Payments",
    questions: [
      { q: "How do I pay for a booking?", a: "Payments are made securely through our platform using credit/debit cards. We never share your payment details with entertainers." },
      { q: "What payment methods are accepted?", a: "We accept Visa, Mastercard, and American Express. Apple Pay and Google Pay are also available on supported devices." },
      { q: "Is there a platform fee?", a: "Yes, there's a $30 booking fee per booking. This covers our platform costs and safety features." },
    ],
  },
  {
    id: "safety",
    title: "Safety Precautions",
    questions: [
      { q: "Soft vs Hard profiles", a: "Soft profile = ID verified only. Hard profile = ID plus police check. You can filter by profile type when browsing." },
      { q: "Safety button", a: "Entertainers have access to a safety alert button during bookings. When pressed, it sends their location and booking details to their emergency contact." },
      { q: "Location sharing", a: "We recommend sharing your location with a friend when attending or hosting a booking. Entertainers can share their live location with their emergency contact via the safety button." },
      { q: "Start/End booking verification codes", a: "Arrival and completion codes help confirm that the entertainer attended and that the booking started and ended as agreed." },
      { q: "Recommend sharing location with a friend", a: "For your safety, we recommend sharing your location or event details with a trusted friend when booking an entertainer." },
    ],
  },
  {
    id: "banned",
    title: "Account",
    questions: [
      { q: "What gets me banned?", a: "Fraud, harassment, fake events, repeated no-shows or cancellations, or violating our Terms can result in account suspension or ban. Both clients and entertainers are held to our community standards." },
    ],
  },
];

export const FAQ_ENTERTAINER = [
  {
    id: "booking",
    title: "Booking",
    questions: [
      { q: "What if the user cancels?", a: "If the client cancels, they are charged according to our cancellation policy (within 72h = full fee; outside 72h = $80 fee). You may receive a portion. The $30 platform fee is non-refundable to the client." },
      { q: "No response after arrival", a: "If you arrive and the client doesn't respond or isn't there: after 15 minutes, submit location proof (e.g. photo/check-in). You keep the full deposit; the $30 platform fee is retained. Document everything for support." },
      { q: "Personal info – no sharing before deposit", a: "Do not share personal phone numbers, emails, or social handles before the booking is confirmed and deposit is paid. Use the app to communicate. This protects you and the client." },
      { q: "Booking form warning – if user lies", a: "If the client lied about the event, guests, or venue (e.g. fake event, wrong address, unsafe situation), you may refuse to perform. Report to support with evidence. Refund decisions are made case-by-case; you may not be penalized for refusing an unsafe or fraudulent booking." },
    ],
  },
  {
    id: "cancellation",
    title: "Cancellation policy",
    questions: [
      { q: "When the user cancels", a: "Client pays according to timing (within 72h = full fee; outside 72h = $80). You may receive $50 for outside-72h cancellations. The $30 booking fee is not refunded to them." },
      { q: "When you (entertainer) cancel", a: "You pay a $30 cancellation fee and the client receives a full refund of their deposit. Avoid cancelling except in emergencies; repeated cancellations can lead to penalties." },
      { q: "Repeated cancellations", a: "Frequent cancellations are flagged and can result in account restrictions or blacklist. Only accept bookings you can commit to." },
    ],
  },
  {
    id: "payment",
    title: "Payments",
    questions: [
      { q: "How do I receive my payment?", a: "After the booking is marked complete, your earnings (minus the $30 platform fee) are released. Payouts are processed to your bank account on file. Set up bank details in Settings." },
      { q: "$30 cancellation fee system", a: "If you cancel a booking, a $30 fee is charged. If unpaid, you may be blocked from accepting new bookings until the balance is cleared. Your Finances screen will show a -$30 balance until paid." },
      { q: "Cancel → payment screen / unpaid → block new bookings", a: "When you cancel, you'll see the $30 fee. Pay it via the payment screen. If you don't pay, new bookings may be blocked until your balance is settled." },
    ],
  },
  {
    id: "disputes",
    title: "Disputes",
    questions: [
      { q: "What if client lied / fake event / fake guests?", a: "If you have evidence the client misrepresented the event (fake event, wrong number of guests, unsafe venue), report it to support with proof. You may be able to refuse without refund liability. We review each case." },
    ],
  },
  {
    id: "banned",
    title: "Account",
    questions: [
      { q: "What gets me banned?", a: "Fraud, harassment, no-shows, repeated cancellations, or violating our Terms can result in account suspension or ban. Both clients and entertainers are held to our community standards." },
    ],
  },
];
