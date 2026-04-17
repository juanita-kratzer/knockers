// src/pages/shared/BlockedEntertainersPage.jsx
// User's blocked entertainers - route: /blocked/entertainers

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

export default function BlockedEntertainersPage() {
  return (
    <PageContainer>
      <PageHeader title="Blocked Entertainers" showBack />
      <Empty>You haven't blocked anyone. Blocked entertainers won't see your requests or message you.</Empty>
    </PageContainer>
  );
}
