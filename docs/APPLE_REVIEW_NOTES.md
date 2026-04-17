# Apple App Review — Notes for Reviewers (Phase 7)

Use this when submitting the Knockers app to App Store Connect. Paste or adapt the content below into **App Review Information → Notes**.

---

## Test account (required for full testing)

The app has **two sides**: **Client** (book entertainers) and **Entertainer** (accept bookings, receive payouts). To test both without creating two accounts, we provide a **single test account** that can switch between client and entertainer.

**Sign-in credentials:**  
*(Provide the email and password you set in Firebase Auth for the review account. Do not commit real passwords to the repo — add them here only in App Store Connect or in a private note.)*

- **Email:** [Enter the test account email, e.g. as provided in App Store Connect → Sign-in required]
- **Password:** [Enter the test account password]

**One-time setup after first sign-in:**  
1. Open the app and sign in with the credentials above.  
2. Go to **Settings** (profile or menu).  
3. In the **Account** section, find **“Setup full test account”** and tap **Run**.  
4. The app will reload. You can then use **Profile** → **Switch to Entertainer Dashboard** or **Switch to Client Dashboard** to test both flows.

**What this does:**  
The “Setup full test account” button calls a **secure backend function** that only runs for the email address configured as the review test account. It creates the minimal profile data (client + entertainer) so this one account can act as both roles. No other user can trigger this; the backend rejects any other email with “Only the test account can run this.”

---

## In-App Purchase (verification fee)

- **What:** A one-time **verification fee** ($2 AUD) is required to unlock messaging, bookings, and listings.
- **How:** Users pay via **Apple In-App Purchase** (non-consumable). The app does not use Stripe or any other payment for this digital unlock.
- **Where:** Settings → **Verification** (or the prompt after signup). Receipt is validated server-side; no workaround.

---

## Real-world payments (Stripe)

- **What:** When a **client** books an **entertainer**, they pay a **deposit** (set by the entertainer) plus a **$30 platform fee** via **Stripe**.
- **Why allowed:** This is payment for **real-world services** (in-person entertainment at an event), not for digital goods or unlocks. Per Apple’s guidelines, such payments may use Stripe.
- **Transparency:** The $30 fee is shown before payment (e.g. on the booking acceptance and payment screens) and in FAQ/Terms.

---

## Safety and moderation

- **Safety button:** Entertainers have a **Safety** button in the booking chat that notifies their emergency contact with location and booking details. An emergency contact can be set in Settings.
- **Blocking:** Users can block other users (Settings → Blocked).
- **Admin:** The platform has admin tools to ban/suspend users, resolve disputes, and process refunds. (Admin access is not available to the test account unless you create an admin user separately.)

---

## Legal and support

- **Terms, Privacy Policy, Contractor Agreement:** Available in-app via **Settings** → **Terms** / **Privacy** / **Contractor Agreement** (or from signup and footer links). Content is the same as the final, effective documents.
- **Contact:** support@knockers.app (or your support email) for questions.

---

## Optional: Demo / no backend

If the app is run without Firebase/Stripe configured (e.g. local build), some flows will show “demo” behaviour (no real data or payments). For a full review, use a build that points to your production or review backend and the test account above.

---

*Keep this doc updated if you change the test account flow or add new reviewer instructions.*
