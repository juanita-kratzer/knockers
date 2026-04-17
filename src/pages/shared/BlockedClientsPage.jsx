// src/pages/shared/BlockedClientsPage.jsx
// Entertainer's blocked clients - route: /blocked/clients

import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import styled from "styled-components";

const Empty = styled.p`
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 24px 16px 0;
  text-align: center;
`;

export default function BlockedClientsPage() {
  return (
    <PageContainer>
      <PageHeader title="Blocked Clients" showBack />
      <Empty>You haven't blocked anyone. Blocked clients cannot book or message you.</Empty>
    </PageContainer>
  );
}
