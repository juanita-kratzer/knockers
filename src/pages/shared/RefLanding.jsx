// Phase 5: Referral link landing — /ref/:refCode
// Redirects to signup with referral code in search params so signup can save referredBy + create referral doc.

import { useEffect } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";

export default function RefLanding() {
  const { refCode } = useParams();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("campaign") || "";
  const source = searchParams.get("source") || "referral";
  const leadId = searchParams.get("lead") || "";

  if (!refCode) return <Navigate to="/signup" replace />;

  const params = new URLSearchParams();
  params.set("ref", refCode);
  if (campaignId) params.set("campaign", campaignId);
  if (source) params.set("source", source);
  if (leadId) params.set("lead", leadId);

  const to = `/signup?${params.toString()}`;
  return <Navigate to={to} replace />;
}
