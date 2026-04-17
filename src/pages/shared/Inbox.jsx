// src/pages/shared/Inbox.jsx
// Messaging inbox – AMBTN-style: list with search, last message preview, tap to open thread

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../context/RoleContext";
import { useConversations } from "../../hooks/useMessages";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";

export default function Inbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, isEntertainer } = useRole();
  const { conversations, loading, error } = useConversations(user?.uid, role);
  const [searchText, setSearchText] = useState("");

  const filteredConversations = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((booking) => {
      const name = (isEntertainer ? booking.clientName : booking.entertainerName) || "";
      const preview = (booking.lastMessage || "").toLowerCase();
      return name.toLowerCase().includes(q) || preview.includes(q);
    });
  }, [conversations, searchText, isEntertainer]);

  if (loading) {
    return (
      <Container>
        <LoadingWrapper>
          <LoadingSpinner size={32} />
        </LoadingWrapper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage error={error} onRetry={() => window.location.reload()} />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Messages</Title>
        {conversations.length > 0 && (
          <ConversationCount>{conversations.length}</ConversationCount>
        )}
      </Header>

      {!user ? (
        <EmptyState
          title="Sign in to view messages"
          message="Create an account or sign in to access your inbox"
          actionText="Sign In"
          actionTo="/client/login"
        />
      ) : conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          message={isEntertainer
            ? "Accept a booking request to start chatting with clients"
            : "Book an entertainer and wait for them to accept to start messaging"
          }
          actionText={isEntertainer ? "View Requests" : "Browse Entertainers"}
          actionTo={isEntertainer ? "/talent" : "/explore"}
        />
      ) : (
        <>
          <SearchWrap>
            <SearchInput
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search name or message…"
            />
            {searchText ? (
              <ClearBtn type="button" onClick={() => setSearchText("")}>
                Clear
              </ClearBtn>
            ) : null}
          </SearchWrap>

          {filteredConversations.length === 0 ? (
            <EmptySearch>
              <h3>No matches</h3>
            </EmptySearch>
          ) : (
            <ConversationList>
              {filteredConversations.map((booking) => {
                const otherName = isEntertainer
                  ? booking.clientName || "Client"
                  : booking.entertainerName || "Entertainer";
                const preview = booking.lastMessage || `Booking ${formatDate(booking.eventDate)}`;
                const time = booking.lastMessageAt?.toDate?.() || booking.updatedAt?.toDate?.() || booking.createdAt?.toDate?.();
                return (
                  <ListItem
                    key={booking.id}
                    onClick={() => navigate(`/inbox/${booking.id}`)}
                  >
                    <Avatar>
                      {isEntertainer
                        ? (booking.clientName?.[0] || "C")
                        : (booking.entertainerName?.[0] || "E")}
                    </Avatar>
                    <ListItemText>
                      <ListItemHeader>
                        <ListItemName>{otherName}</ListItemName>
                        <ListItemTime>{formatTimeAgo(time)}</ListItemTime>
                      </ListItemHeader>
                      <ListItemPreview>{preview}</ListItemPreview>
                    </ListItemText>
                  </ListItem>
                );
              })}
            </ConversationList>
          )}
        </>
      )}
    </Container>
  );
}

// Helper functions
function formatDate(dateValue) {
  if (!dateValue) return "TBD";
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  return date.toLocaleDateString("en-AU", { 
    month: "short", 
    day: "numeric" 
  });
}

function formatTimeAgo(date) {
  if (!date) return "";
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

const Container = styled.div`
  min-height: 100%;
  background: ${({ theme }) => theme.bg};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const ConversationCount = styled.span`
  padding: 4px 10px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 20px;
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

const SearchWrap = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.card};
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  outline: none;
  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const ClearBtn = styled.button`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  font-weight: 500;
  cursor: pointer;
`;

const EmptySearch = styled.div`
  margin: 1rem 16px;
  padding: 1.5rem;
  text-align: center;
  background: ${({ theme }) => theme.card};
  border: 1px dashed ${({ theme }) => theme.border};
  border-radius: 12px;
  h3 {
    margin: 0;
    font-size: 1rem;
    color: ${({ theme }) => theme.muted};
  }
`;

const ConversationList = styled.div`
  padding: 8px 12px 100px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ListItem = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.card};
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s;
  &:hover,
  &:active {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ theme }) => theme.bg};
  border: 1px solid ${({ theme }) => theme.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
  flex-shrink: 0;
`;

const ListItemText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ListItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const ListItemName = styled.div`
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListItemTime = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.muted};
  flex-shrink: 0;
`;

const ListItemPreview = styled.div`
  font-size: 0.88rem;
  color: ${({ theme }) => theme.muted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
