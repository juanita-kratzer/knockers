// src/components/ErrorMessage.jsx
// Reusable error display component

import styled from "styled-components";

// Firestore "index required" messages contain a console link
const INDEX_LINK_REGEX = /(https:\/\/console\.firebase\.google\.com[^\s]+)/;

export default function ErrorMessage({ 
  error, 
  title = "Something went wrong",
  onRetry 
}) {
  const errorMessage = typeof error === "string" 
    ? error 
    : error?.message || "An unexpected error occurred";

  const indexMatch = errorMessage.match(INDEX_LINK_REGEX);
  const indexUrl = indexMatch ? indexMatch[1] : null;
  const isIndexError = errorMessage.toLowerCase().includes("index") && indexUrl;

  return (
    <Container>
      <Icon>!</Icon>
      <Title>{title}</Title>
      <Message>
        {isIndexError ? (
          <>
            The query requires a Firestore index. Create it in Firebase (takes 1–2 minutes), then tap Try Again.
          </>
        ) : (
          errorMessage
        )}
      </Message>
      {isIndexError && indexUrl && (
        <IndexLink href={indexUrl} target="_blank" rel="noopener noreferrer">
          Create index in Firebase Console
        </IndexLink>
      )}
      {onRetry && (
        <RetryButton onClick={onRetry}>Try Again</RetryButton>
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
`;

const Icon = styled.div`
  font-size: 40px;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  color: ${({ theme }) => theme.text};
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

const Message = styled.p`
  color: ${({ theme }) => theme.muted};
  margin: 0 0 20px 0;
  max-width: 320px;
  line-height: 1.5;
  font-size: 0.9rem;
`;

const IndexLink = styled.a`
  display: inline-block;
  margin-bottom: 16px;
  padding: 12px 20px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  word-break: break-all;

  &:active {
    opacity: 0.9;
  }
`;

const RetryButton = styled.button`
  padding: 12px 24px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  
  &:active {
    background: ${({ theme }) => theme.hoverDark};
  }
`;





