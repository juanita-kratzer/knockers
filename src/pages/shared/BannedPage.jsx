// src/pages/shared/BannedPage.jsx
// Shown when user is banned (blocked from app except admin)

import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";

export default function BannedPage() {
  const { logout } = useAuth();

  return (
    <Wrap>
      <Card>
        <Title>Account suspended</Title>
        <Text>Your account has been suspended or banned. You cannot use the platform.</Text>
        <Text>If you believe this is an error, please contact support.</Text>
        <Button onClick={async () => { try { await logout(); } catch (e) { /* ignore */ } }}>Sign out</Button>
      </Card>
    </Wrap>
  );
}

const Wrap = styled.div`
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: ${({ theme }) => theme.bg};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  text-align: center;
`;

const Title = styled.h1`
  margin: 0 0 16px;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.text};
`;

const Text = styled.p`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
  line-height: 1.5;
`;

const Button = styled.button`
  margin-top: 20px;
  padding: 12px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
`;
