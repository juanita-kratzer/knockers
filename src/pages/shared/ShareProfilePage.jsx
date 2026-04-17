// src/pages/shared/ShareProfilePage.jsx - route: /settings/share-profile
// Entertainer: share public profile link

import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../context/RoleContext";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import styled from "styled-components";

const CopyBox = styled.div`
  margin: 24px 16px 0;
  padding: 16px;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 12px;
  word-break: break-all;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
`;

const CopyButton = styled.button`
  margin-top: 12px;
  padding: 12px 20px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
`;

export default function ShareProfilePage() {
  const { user } = useAuth();
  const { isEntertainer } = useRole();
  const profileUrl = user?.uid ? `${window.location.origin}/talent/${user.uid}` : "";

  const handleCopy = () => {
    if (profileUrl) {
      navigator.clipboard?.writeText(profileUrl);
      alert("Link copied to clipboard");
    }
  };

  if (!isEntertainer) {
    return (
      <PageContainer>
        <PageHeader title="Your Profile Link" showBack />
        <CopyBox>This page is for entertainers to share their public profile.</CopyBox>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Your Profile Link" showBack />
      <CopyBox>
        Share this link with clients so they can view your profile and book you:
        <br />
        <strong style={{ color: "var(--text-primary)" }}>{profileUrl || "—"}</strong>
      </CopyBox>
      {profileUrl && <CopyButton onClick={handleCopy}>Copy link</CopyButton>}
    </PageContainer>
  );
}
