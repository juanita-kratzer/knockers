// src/pages/shared/ChooseDashboard.jsx
// Shown after login when user has both client and entertainer accounts

import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { User, Theater } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRole, ROLES } from "../../context/RoleContext";
import { logger } from "../../lib/logger";

export default function ChooseDashboard() {
  const navigate = useNavigate();
  const { refetchUserData } = useAuth();
  const { setRole } = useRole();

  const handleChoose = async (role) => {
    try {
      await setRole(role);
      await refetchUserData();
      navigate(role === ROLES.ENTERTAINER ? "/talent" : "/client", { replace: true });
    } catch (e) {
      logger.error("Switch role failed:", e);
    }
  };

  return (
    <Container>
      <Title>Choose dashboard</Title>
      <Subtitle>You can switch anytime from your profile.</Subtitle>

      <Options>
        <OptionButton onClick={() => handleChoose(ROLES.CLIENT)}>
          <OptionIcon><User size={28} /></OptionIcon>
          <OptionLabel>Client dashboard</OptionLabel>
          <OptionHint>Book and manage bookings</OptionHint>
        </OptionButton>
        <OptionButton onClick={() => handleChoose(ROLES.ENTERTAINER)}>
          <OptionIcon><Theater size={28} /></OptionIcon>
          <OptionLabel>Entertainer dashboard</OptionLabel>
          <OptionHint>Manage your gigs and requests</OptionHint>
        </OptionButton>
      </Options>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.bg};
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h1`
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  text-align: center;
`;

const Subtitle = styled.p`
  margin: 0 0 32px 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.muted};
  text-align: center;
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 320px;
`;

const OptionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 20px;
  background: ${({ theme }) => theme.card};
  border: 2px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  text-align: center;

  &:active {
    border-color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.hover};
  }
`;

const OptionIcon = styled.span`
  color: ${({ theme }) => theme.primary};
`;

const OptionLabel = styled.span`
  font-size: 1rem;
  font-weight: 600;
`;

const OptionHint = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;
