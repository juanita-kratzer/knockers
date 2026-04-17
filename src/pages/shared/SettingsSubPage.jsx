// src/pages/shared/SettingsSubPage.jsx
// Reusable wrapper for settings sub-pages: back button, title, optional empty state.
// Used for Notifications, Payment Methods, Bank, Emergency Contact, Share Profile, Referral, etc.

import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import styled from "styled-components";

const EmptyMessage = styled.p`
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 24px 0 0;
  text-align: center;
`;

export default function SettingsSubPage({ title, children, emptyMessage }) {
  return (
    <PageContainer>
      <PageHeader title={title} showBack />
      {children ?? (emptyMessage && <EmptyMessage>{emptyMessage}</EmptyMessage>)}
    </PageContainer>
  );
}
