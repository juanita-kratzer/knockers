/**
 * Idempotency key for Stripe API calls.
 * Format: action:bookingId:version (version can be timestamp or state hash).
 */
export function idempotencyKey(action: string, bookingId: string, version?: string): string {
  const v = version ?? String(Date.now());
  return `${action}:${bookingId}:${v}`;
}
