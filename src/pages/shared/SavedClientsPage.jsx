// src/pages/shared/SavedClientsPage.jsx
// Entertainer's saved clients - route: /saved/clients

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

export default function SavedClientsPage() {
  return (
    <PageContainer>
      <PageHeader title="Saved Clients" showBack />
      <Empty>Your saved clients will appear here.</Empty>
    </PageContainer>
  );
}
