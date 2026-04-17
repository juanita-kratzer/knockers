// src/pages/shared/ReferralPage.jsx - route: /settings/referral
// Phase 5: Show referral link when user has entertainer refCode

import { useAuth } from "../../context/AuthContext";
import { useMyEntertainerProfile } from "../../hooks/useEntertainers";
import SettingsSubPage from "./SettingsSubPage";
import styled from "styled-components";

export default function ReferralPage() {
  const { user } = useAuth();
  const { entertainer } = useMyEntertainerProfile(user?.uid);
  const refCode = entertainer?.refCode;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://knockers.app";
  const refLink = refCode ? `${baseUrl}/ref/${refCode}` : null;

  return (
    <SettingsSubPage title="Refer Entertainers">
      <p style={{ color: "var(--muted)", fontSize: "0.95rem", margin: "0 0 16px" }}>
        Invite other entertainers to join Knockers and earn when they complete bookings.
      </p>
      {refLink ? (
        <RefBlock>
          <Label>Your referral link</Label>
          <LinkBox>{refLink}</LinkBox>
          <CopyHint>Share this link; when someone signs up via it, they’ll be attributed to you.</CopyHint>
        </RefBlock>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Your referral link will appear here once your entertainer profile is set up.
        </p>
      )}
    </SettingsSubPage>
  );
}

const RefBlock = styled.div`
  margin-top: 16px;
`;
const Label = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  margin-bottom: 6px;
`;
const LinkBox = styled.div`
  padding: 12px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  font-size: 0.9rem;
  word-break: break-all;
  color: ${({ theme }) => theme.primary};
`;
const CopyHint = styled.p`
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;
