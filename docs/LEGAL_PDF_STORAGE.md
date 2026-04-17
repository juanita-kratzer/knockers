# Legal PDF — Firebase Storage

## Privacy Policy PDF

- **File:** `KNOCKERS — PRIVACY POLICY.pdf` (with 📄 in name in console; actual object name may be sanitized)
- **Bucket:** `knockers-c5e30.firebasestorage.app`
- **Storage path:** `gs://knockers-c5e30.firebasestorage.app/...` (path as shown in Firebase Console → Storage)

## Security

- **Do not** commit any access tokens or download tokens to the repo.
- If an access token was shared or exposed, **revoke it** in Firebase Console (Storage → file → access token → Revoke).
- For in-app or public links, use a **stable download URL** from Firebase Console (Files → select file → “Get download URL”) or a **signed URL** from a Cloud Function. Do not hardcode tokens in source.

## Using the PDF in the app

1. **Get a public URL**  
   In Firebase Console → Storage → open the Privacy Policy file → use “Get download URL” (or configure Storage rules and use a path-based URL). Copy the URL somewhere safe (e.g. env or remote config); do not commit the URL if it contains a long-lived token, or rotate the token periodically.

2. **Optional: link from in-app Privacy**  
   - Keep the current in-app Privacy view at `/legal/privacy` (markdown from `public/legal/privacy-policy.md`).  
   - Add a line and link: “Official PDF: [Download Privacy Policy (PDF)](YOUR_PUBLIC_URL)” so users can open the stored PDF.  
   - Or store the PDF URL in Firebase Remote Config / env (e.g. `VITE_PRIVACY_PDF_URL`) and use that in the app.

3. **App Store Connect**  
   Use the same public Privacy Policy URL (that opens the PDF or your hosting) in App Store Connect → App Privacy → Privacy Policy URL.

## Current in-app behaviour

- **Settings → Privacy Policy** and **Footer → Privacy** go to `/legal/privacy`, which renders `public/legal/privacy-policy.md` via `LegalDoc.jsx`.
- The PDF in Storage can be the **canonical** version for downloads and App Store; the in-app markdown can stay as the in-app view or be supplemented with a “View PDF” link once you have the public URL.
