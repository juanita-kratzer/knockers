# Prompt for ChatGPT: "Signed in but could not load your profile"

If login still shows **"Signed in but could not load your profile. Please try again or contact support."** after trying the fixes in this repo, use the prompt below with ChatGPT (paste the whole thing).

---

## Copy from here (prompt for ChatGPT)

```
My React + Firebase web app shows this error on the login page after a successful sign-in: "Signed in but could not load your profile. Please try again or contact support."

Context:
- Firebase Auth sign-in succeeds (email/password).
- The error is shown when the code catches an error that has message containing "permission" or code "permission-denied".
- The app then tries to load or create the current user's Firestore document from the `users` or `users_dev` collection (path: users/{uid} or users_dev/{uid}) so it can read `role` and navigate (client vs entertainer).
- We already added a Cloud Function callable `ensureUserProfileCallable` that creates/updates the user document server-side (Firebase Admin SDK) and returns `{ ok: true, role, hasEntertainerProfile }`. The client calls this right after sign-in and, if it gets `ok: true`, uses the returned role and skips any client-side Firestore read. If the callable fails or returns nothing, the client falls back to getDoc/setDoc on the user ref.
- So the failure could be: (1) the callable is not being invoked or is failing (network, CORS, wrong region, wrong name), (2) the client still runs the fallback getDoc/setDoc and that throws permission-denied, or (3) something else throws with "permission" in the message.

Relevant code locations:
- Login submit handler: src/pages/shared/Login.jsx — after signInWithEmailAndPassword it calls ensureUserProfileCallable, then if response has ok: true it uses returned role and navigates; else it does getDoc(userRef) and optionally setDoc.
- Callable: functions/src/index.ts — ensureUserProfileCallable (region australia-southeast1). It uses Admin SDK to get/set the user doc in collection users or users_dev based on client payload useDev.
- Firestore rules: firestore.rules — users and users_dev allow read if isAuthenticated(), create/update if request.auth.uid == userId.
- Collections: src/lib/collections.js — COL.users is "users" or "users_dev" based on import.meta.env.DEV.

What I need:
1. Identify the most likely cause of the error (e.g. callable not reached, callable failing, client getDoc/setDoc still running and failing, or rules/timing issue).
2. Suggest concrete steps to verify (e.g. what to log in the browser console, or what to check in Firebase Console / Network tab).
3. Propose a minimal code change (client and/or function and/or rules) to fix it so that after sign-in we either use the callable response and navigate without touching Firestore, or we safely load/create the user doc on the client and then navigate.
```

---

## After you get a response

- Try the suggested checks and code changes.
- If you fix it, consider noting the solution in this file or in PROJECT_MEMORY.md for next time.
