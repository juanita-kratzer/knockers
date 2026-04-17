// src/pages/shared/NotFoundPage.jsx - 404 fallback

import { Link } from "react-router-dom";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import styled from "styled-components";

const Message = styled.p`
  color: ${({ theme }) => theme.muted};
  font-size: 1rem;
  line-height: 1.6;
  margin: 24px 16px;
  text-align: center;
`;

const HomeLink = styled(Link)`
  display: inline-block;
  margin-top: 16px;
  padding: 14px 28px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
`;

export default function NotFoundPage() {
  return (
    <PageContainer>
      <PageHeader title="Page not found" showBack />
      <Message>The page you're looking for doesn't exist or has been moved.</Message>
      <div style={{ textAlign: "center" }}>
        <HomeLink to="/">Go to Home</HomeLink>
      </div>
    </PageContainer>
  );
}
