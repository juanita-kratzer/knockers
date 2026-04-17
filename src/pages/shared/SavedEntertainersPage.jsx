// src/pages/shared/SavedEntertainersPage.jsx
// User's saved/favorite entertainers - route: /saved/entertainers

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

export default function SavedEntertainersPage() {
  return (
    <PageContainer>
      <PageHeader title="Saved Entertainers" showBack />
      <Empty>Your favorites list is empty. Save entertainers from their profiles to see them here.</Empty>
    </PageContainer>
  );
}
