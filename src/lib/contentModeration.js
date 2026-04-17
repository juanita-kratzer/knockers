// src/lib/contentModeration.js
// Reusable validator: block phone, email, @handles, and obvious contact keywords in UGC.

const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}|\d{8,}/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const HANDLE_REGEX = /@[\w.]+/;
const CONTACT_KEYWORDS = /\b(instagram|insta|snap(chat)?|whatsapp|telegram|signal|facebook|fb|twitter|tiktok|onlyfans)\s*:?\s*[\w.@]*/gi;

/**
 * Returns a reason string if text contains forbidden contact info, otherwise null.
 */
export function containsForbiddenContactInfo(text) {
  if (!text || typeof text !== "string") return null;
  const t = text.trim();
  if (!t) return null;
  if (PHONE_REGEX.test(t)) return "Please don't include phone numbers. Use the app to communicate.";
  if (EMAIL_REGEX.test(t)) return "Please don't include email addresses. Use the app to communicate.";
  if (HANDLE_REGEX.test(t)) return "Please don't include @handles or social usernames.";
  if (CONTACT_KEYWORDS.test(t)) return "Please don't share other contact or social links here.";
  return null;
}

/**
 * Check text for forbidden contact info.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function sanitizeOrReject(text) {
  const reason = containsForbiddenContactInfo(text);
  if (reason) return { ok: false, reason };
  return { ok: true };
}
