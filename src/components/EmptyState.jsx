// src/components/EmptyState.jsx
// Reusable empty state component

import styled from "styled-components";
import { Link } from "react-router-dom";

export default function EmptyState({ 
  icon = "", 
  title, 
  message, 
  actionText, 
  actionTo,
  onAction 
}) {
  return (
    <Container>
      <Icon>{icon}</Icon>
      <Title>{title}</Title>
      {message && <Message>{message}</Message>}
      {actionText && actionTo && (
        <ActionLink to={actionTo}>{actionText}</ActionLink>
      )}
      {actionText && onAction && (
        <ActionButton onClick={onAction}>{actionText}</ActionButton>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  min-height: 300px;
`;

const Icon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
`;

const Title = styled.h3`
  color: ${({ theme }) => theme.text};
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  font-weight: 600;
`;

const Message = styled.p`
  color: ${({ theme }) => theme.muted};
  margin: 0 0 24px 0;
  max-width: 280px;
  line-height: 1.5;
  font-size: 0.95rem;
`;

const ActionLink = styled(Link)`
  padding: 12px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  
  &:active {
    opacity: 0.9;
  }
`;

const ActionButton = styled.button`
  padding: 12px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  
  &:active {
    opacity: 0.9;
  }
`;





