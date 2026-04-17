# Implementation Plan: Contact Blocking via Phone Contacts

**Goal:** Allow entertainers to optionally block users in their phone contacts from seeing their profile.  
**Status:** Plan only — no code until approved.

---

## 1. Overview

- **Who:** Entertainers only (optional feature).
- **What:** If enabled, the app reads the device’s contact phone numbers locally, normalizes and hashes them (SHA-256), and uploads only the hashes to the backend. No contact names or raw numbers are stored.
- **Effect:** When a **viewer** (client) browses entertainers, their own phone number (from their account) is hashed and checked against each entertainer’s stored hash list. If a match is found, that entertainer’s profile is **hidden** from that viewer (not shown in list, and single-profile view returns “hidden” or 404-style behaviour).

---

## 2. Data model

### 2.1 Per-entertainer storage (hashes they uploaded)

- **Path:** `users/{uid}/blockedContactHashes` (single document).
- **Fields (proposed):**
  - `hashes`: array of strings (SHA-256 hashes, e.g. hex).
  - `updatedAt`: timestamp.
- **Constraint:** Firestore document size limit ~1MB; array of 32-byte hex strings (64 chars) → ~15k hashes per doc. If we need more, use a subcollection `users/{uid}/blockedContactHashes/{batchId}` with a `hashes` array per doc.

**Alternative (subcollection):**  
`users/{uid}/blockedContactHashes/{hash}` — one doc per hash, id = hash. Allows add/remove by hash without reading the whole list; slightly more writes.  
**Recommendation:** Start with a single doc and `hashes` array; move to subcollection if we hit size or performance limits.

### 2.2 Index for “who blocks this viewer?”

To avoid scanning every entertainer’s hash list when a viewer loads the app, maintain an **inverse index**:

- **Path:** `contactBlockIndex/{hash}` (one document per viewer-phone hash that is blocked by at least one entertainer).
- **Fields:**
  - `entertainerIds`: array of UIDs (entertainers who have this hash in their blocked list).
  - `updatedAt`: optional.
- **Use:** When viewer opens explore/list or a single profile, backend hashes viewer’s phone, reads `contactBlockIndex/{viewerPhoneHash}` once, and returns the list of entertainer IDs to hide. Client (or backend) filters those out.

**Maintenance:** When an entertainer uploads/replaces their hashes, backend must:
- Write `users/{entertainerId}/blockedContactHashes`.
- For each hash: set `contactBlockIndex/{hash}` with `arrayUnion(entertainerId)`.
- When an entertainer clears or reduces their list: remove that entertainer from the relevant `contactBlockIndex/{hash}` docs (or recompute from new list).

---

## 3. Client-side flow

### 3.1 Permission and disclosure (before any contact access)

- **Place:** Settings (e.g. “Privacy” or “Block by contacts”) and/or entertainer signup/onboarding where `blockContacts` already exists.
- **UI:**
  - Explain: “Block people in your phone contacts from seeing your profile. We only use hashed phone numbers; we never upload your contact list or any names.”
  - Link to Privacy Policy (updated section).
  - **Optional checkbox/toggle:** “Use my contacts to block them from seeing my profile.”
  - **Button:** “Enable and sync” (or similar) — only after tap do we request the Contacts permission.
- **Platform:** Use Capacitor Contacts plugin (or equivalent) on iOS/Android. On **web**, Contacts API is limited; either hide the feature on web or show “Available in the app” and skip permission.

### 3.2 Request Contacts permission

- **iOS:** `NSContactsUsageDescription` in Info.plist (required). Request via Capacitor Contacts plugin.
- **Android:** `READ_CONTACTS`; request at runtime with rationale matching the disclosure above.
- **Behaviour:** If user denies, do not read contacts; option remains off. If user grants, proceed to read.

### 3.3 Read contacts (local only)

- Read only **phone numbers** from the device address book. Do **not** read names, emails, or any other field for this feature.
- Process entirely in memory; no persistence of raw contacts on disk (except normal OS address book).

### 3.4 Normalize to E.164

- Use a single library (e.g. `libphonenumber-js`) so client and backend use the same format.
- For each number: parse, normalize to E.164 (with default country, e.g. AU if not inferrable). Invalid or too-short numbers are skipped.
- Deduplicate after normalization.

### 3.5 Hash (SHA-256)

- Use **Web Crypto API** (browser) or equivalent in Capacitor context: `crypto.subtle.digest('SHA-256', encodedPhone)`.
- Encode phone as UTF-8 (E.164 string); output hash as **hex string** (same format as backend) so we can compare.
- Result: list of hex strings, one per contact number.

### 3.6 Upload hashes only

- Call a **backend callable** (e.g. `setBlockedContactHashes`) with payload: `{ hashes: string[] }`.
- Do **not** send raw numbers, names, or any other contact data.
- Backend validates caller is authenticated, is an entertainer (or has entertainer profile), and rate-limits/limits array size (e.g. max 10k hashes per request).

### 3.7 Clearing / disabling

- If entertainer turns “block by contacts” off: call a callable (e.g. `clearBlockedContactHashes`) so backend clears `users/{uid}/blockedContactHashes` and removes that entertainer from all `contactBlockIndex/{hash}` entries.
- Optional: “Update list” button to re-read contacts and re-upload hashes (same flow as initial sync).

---

## 4. Backend (Cloud Functions / Firestore)

### 4.1 Callable: `setBlockedContactHashes`

- **Input:** `{ hashes: string[] }` (array of SHA-256 hex strings).
- **Checks:** Caller authenticated; caller has entertainer profile (or `users/{uid}.role === 'entertainer'`); `hashes` is array, length within limit (e.g. 1–10000); each element is a 64-char hex string.
- **Logic:**
  1. Read current `users/{uid}/blockedContactHashes` (if any).
  2. For each hash in the **old** list that is **not** in the new list: remove this entertainer’s UID from `contactBlockIndex/{hash}` (or delete doc if empty).
  3. Replace `users/{uid}/blockedContactHashes` with `{ hashes: newHashes, updatedAt: serverTimestamp() }`.
  4. For each hash in **new** list: `contactBlockIndex/{hash}` with `arrayUnion(uid)` (and optional `updatedAt`).
- **Idempotency:** Same list sent twice → same state; no duplicate entries in index.

### 4.2 Callable: `clearBlockedContactHashes`

- **Input:** none (uses `context.auth.uid`).
- **Logic:** Delete `users/{uid}/blockedContactHashes`; for each hash that was in that doc, remove `uid` from `contactBlockIndex/{hash}` (or delete doc if empty). Requires reading the current hashes before delete.

### 4.3 Callable: `getEntertainerIdsHidingViewer`

- **Input:** none (viewer = `context.auth.uid`).
- **Logic:**
  1. Read `users/{viewerUid}.phone` (or equivalent field). If missing or empty, return `[]`.
  2. Normalize phone to E.164 (same lib/rule as client).
  3. Compute SHA-256 hash (hex) of E.164 string.
  4. Read `contactBlockIndex/{hash}`. If missing, return `[]`.
  5. Return `entertainerIds` from that doc (list of entertainer UIDs whose blocked list contains the viewer’s phone hash).
- **Caching:** Client can cache this result per session (e.g. until logout or for 5–10 minutes) to avoid repeated calls when listing many entertainers.

### 4.4 Firestore security rules

- **`users/{uid}/blockedContactHashes`**
  - **Read/write:** only `uid == request.auth.uid` (owner). No one else can read an entertainer’s hash list.
- **`contactBlockIndex/{hash}`**
  - **Read:** authenticated users (so the backend callable can read on behalf of the viewer; alternatively, callable uses Admin SDK and does not expose this collection to client).
  - **Write:** only via backend (Cloud Functions with Admin SDK). Client must **not** be able to write to `contactBlockIndex`. So in rules: `allow read, write: if false;` and access only from Functions.

**Recommendation:** Do **not** allow client read on `contactBlockIndex`. Only the callable `getEntertainerIdsHidingViewer` (running with Admin SDK) reads it and returns the list of entertainer IDs to the client. That way clients never see raw hashes or the index structure.

---

## 5. Profile visibility (where to hide)

### 5.1 List views (explore, map, search, listings)

- **Current:** Client uses `useEntertainers`, `useEntertainersBySuburb`, or similar to fetch entertainers.
- **Change:** After fetching entertainers (or in the same flow), client calls `getEntertainerIdsHidingViewer()`. Then filter out any entertainer whose `id` is in the returned list. Render only the filtered list.
- **Unauthenticated viewer:** If there is no logged-in user, do not call the callable; show all entertainers (or existing behaviour). So “hide by contact” applies only when the viewer is logged in and has a phone number on file.

### 5.2 Single profile view (e.g. `/talent/:id`)

- **Current:** `TalentPublic.jsx` (or equivalent) loads one entertainer by ID.
- **Change:** Before showing the profile, call `getEntertainerIdsHidingViewer()`. If this entertainer’s ID is in the list, show a “Profile not available” or “This profile is hidden” state (do not reveal that they were blocked by contact — generic message to avoid leaking contact-block status). Alternatively, treat as 404 for cleaner UX.
- **Direct link:** If someone opens a direct link to an entertainer who has blocked them by contact, same behaviour: generic “not available” or 404.

### 5.3 Other surfaces

- **Search results, favorites, “saved” entertainers:** Apply the same filter: if entertainer ID is in “entertainerIdsHidingViewer”, hide or show “unavailable.”
- **Admin:** Admin views can bypass this (show all entertainers) if desired; otherwise use the same logic for consistency.

---

## 6. Viewer phone number

- **Requirement:** Viewer’s phone number must be stored and used only for this check. We already have `users/{uid}.phone` (or similar).
- **If viewer has no phone:** `getEntertainerIdsHidingViewer` returns `[]` → no one is hidden from them by contact block. No need to force phone entry for this feature.

---

## 7. Security and privacy

- **Optional:** Contacts permission is optional. If the user declines, “block by contacts” remains off; no contact data is read or sent.
- **Explicit enable:** User must explicitly enable the feature and tap to sync; no automatic contact access in the background.
- **Minimal data:** Only hashed phone numbers (SHA-256 of E.164) are sent and stored. No names, no raw numbers, no contact list.
- **No storage of full contact list:** Confirmed: we never store the full contact list; only hashes.
- **No upload of names:** Confirmed: names are never read for this feature (or if read by the plugin, never sent).
- **Backend validation:** Callables validate caller identity, role (entertainer for set/clear), and hash format/length. Rate-limit and cap array size to prevent abuse.

---

## 8. Platform and dependencies

### 8.1 Capacitor

- **Contacts:** Use `@capacitor-community/contacts` (or official Capacitor plugin if available) for iOS and Android. Ensure `NSContactsUsageDescription` (iOS) and Android permission and rationale strings match the disclosure.
- **Web:** If the app runs in browser, either hide “block by contacts” or show “Available in the mobile app” and do not request Contacts there.

### 8.2 E.164 and hashing

- **Client:** Use `libphonenumber-js` (or equivalent) for E.164; Web Crypto for SHA-256. Ensure default region (e.g. AU) for numbers without country code.
- **Backend (Node):** Same E.164 logic (e.g. `libphonenumber-js` or `google-libphonenumber`); Node `crypto.createHash('sha256').update(phone, 'utf8').digest('hex')` for consistency with client hex output.

### 8.3 Existing “block contacts” flag

- **Signup:** `blockContacts` already exists on entertainer signup. Meaning: “I want to block people in my contacts from seeing my profile.”
- **Behaviour:** If `blockContacts === true`, show the “Enable and sync” flow (permission + read + hash + upload). If `blockContacts === false`, do not request contacts; optionally call `clearBlockedContactHashes` when they turn it off.
- **Settings:** Entertainers can turn “Block by contacts” on/off in Settings; when turned on, run the same permission + sync flow; when off, call clear callable.

---

## 9. Privacy documentation

### 9.1 Privacy Policy updates

Add (or amend) a subsection under “What data we collect” and “How we use it”:

- **Contact blocking (entertainers only):** If you enable “block by contacts,” we use your device’s contact list only to read **phone numbers**. We do not store your contact list, contact names, or any other contact data. We convert phone numbers to a standard format and then hash them (one-way) on your device and send only these hashes to our servers. We use the hashes solely to hide your profile from users whose phone number matches a hash you have uploaded. You can disable this at any time and we will delete your stored hashes.
- **Viewer phone for blocking:** When you have a phone number on your account, we may use a hashed version of it to apply entertainers’ “block by contacts” settings so that those entertainers’ profiles are hidden from you. We do not use this for any other purpose.

Also ensure:

- Contacts access is described as **optional** and only for entertainers who enable the feature.
- It is clear that **no contact names or raw numbers** are stored.

### 9.2 In-app disclosure (short)

- One to two sentences before the Contacts permission request, e.g.: “We’ll only use your contacts’ phone numbers to block them from seeing your profile. We hash the numbers and never store names or your full contact list.”

---

## 10. Implementation order (high level)

1. **Backend**
   - Add Firestore structure: `users/{uid}/blockedContactHashes`, `contactBlockIndex/{hash}`.
   - Implement callables: `setBlockedContactHashes`, `clearBlockedContactHashes`, `getEntertainerIdsHidingViewer`.
   - Deploy Firestore rules (owner-only for blockedContactHashes; no client access to contactBlockIndex).
   - Add E.164 + SHA-256 logic in Node (shared or duplicated with client for consistency).

2. **Client – core**
   - Add Capacitor Contacts plugin and permission wiring (iOS/Android).
   - Add E.164 normalization (lib) and SHA-256 hashing (Web Crypto) in app.
   - Implement “sync” flow: request permission → read numbers → normalize → hash → call `setBlockedContactHashes`.
   - Implement “clear” when feature is turned off: call `clearBlockedContactHashes`.
   - Call `getEntertainerIdsHidingViewer` when viewer is logged in; cache result for the session (or short TTL).

3. **Client – UI**
   - Settings: “Block by contacts” toggle + “Enable and sync” (with disclosure and Privacy link before first permission request).
   - Wire existing signup `blockContacts` to the same sync flow when enabled.
   - List/single-profile: filter out entertainers whose ID is in the “hiding viewer” list; show generic “not available” for single profile when blocked.

4. **Privacy**
   - Update Privacy Policy (new subsection as above).
   - Finalize in-app disclosure text and ensure it appears before requesting Contacts.

5. **QA**
   - Test: enable feature → grant permission → sync → log in as another user with phone in contacts → verify profile hidden.
   - Test: deny permission → verify no data sent; test clear/disable → verify hashes removed and profile visible again.
   - Test: viewer with no phone → no one hidden by contact block.

---

## 11. Edge cases and limits

- **Viewer changes phone:** When viewer updates their phone in profile, next time they load the app we use the new hash; no extra backend invalidation needed if we don’t cache by phone.
- **Entertainer removes a contact from device and re-syncs:** New hash list no longer contains that hash; backend removes that hash from `users/.../blockedContactHashes` and removes entertainer from `contactBlockIndex/{hash}`. Viewer may see the profile again.
- **Max hashes per user:** Cap at 10k (or 15k) per request to avoid abuse and doc size; document in Privacy Policy if needed.
- **Rate limiting:** Throttle `setBlockedContactHashes` (e.g. once per N minutes per user) to avoid spam.
- **Hash format:** Always UTF-8 E.164 string, then SHA-256, then hex; same on client and server so matches are consistent.

---

## 12. Summary checklist (for approval)

- [ ] Data model: `users/{uid}/blockedContactHashes` + `contactBlockIndex/{hash}` agreed.
- [ ] Only hashed phone numbers stored; no names, no raw contact list.
- [ ] Contacts permission optional and after explicit user action + disclosure.
- [ ] Backend callables: set, clear, getEntertainerIdsHidingViewer.
- [ ] Profile hidden in list and single-profile when viewer’s phone hash is in entertainer’s list.
- [ ] Privacy Policy and in-app disclosure updated.
- [ ] Implementation order and platform (Capacitor, E.164 lib, Web Crypto) agreed.

**No code will be written until this plan is approved.**
