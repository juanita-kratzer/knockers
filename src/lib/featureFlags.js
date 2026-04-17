/**
 * Feature flags (env-based). Use for staged rollout.
 */
export function isStripeEnabled() {
  return import.meta.env.VITE_STRIPE_ENABLED === "true";
}
