// src/pages/shared/Conversation.jsx
// Individual conversation/chat view for a booking

import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import { useBooking, BOOKING_STATUS } from "../../hooks/useBookings";
import { useBookingMessages, sendMessage } from "../../hooks/useMessages";
import { useEntertainer } from "../../hooks/useEntertainers";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import SafetyButton from "../../components/SafetyButton";
import { logger } from "../../lib/logger";

export default function Conversation() {
  const { bookingId } = useParams();
  const { user, userData } = useAuth();
  const { booking, loading: bookingLoading, error: bookingError } = useBooking(bookingId);
  const { messages, loading: messagesLoading, canMessage, error: messagesError } = useBookingMessages(bookingId);
  
  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Get the other party's info
  const isEntertainer = booking?.entertainerId === user?.uid;
  const otherPartyId = isEntertainer ? booking?.clientId : booking?.entertainerId;
  const { entertainer } = useEntertainer(isEntertainer ? null : booking?.entertainerId);
  const showSafetyButton = isEntertainer && canMessage && booking && [BOOKING_STATUS.DEPOSIT_PAID, BOOKING_STATUS.IN_PROGRESS].includes(booking.status);
  const hasEmergencyContact = !!(userData?.emergencyContactPhone || userData?.emergencyContactEmail);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !canMessage) return;

    setSending(true);
    try {
      await sendMessage(
        bookingId,
        user.uid,
        userData?.name || "User",
        newMessage.trim()
      );
      setNewMessage("");
    } catch (err) {
      logger.error("Failed to send message:", err);
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  if (bookingLoading || messagesLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (bookingError || messagesError) {
    return <ErrorMessage error={bookingError || messagesError} />;
  }

  if (!booking) {
    return (
      <ErrorMessage 
        title="Booking not found"
        error="This booking doesn't exist or you don't have access to it."
      />
    );
  }

  const otherName = isEntertainer 
    ? booking.clientName || "Client"
    : entertainer?.displayName || booking.entertainerName || "Entertainer";

  return (
    <Container>
      <PageHeader
        title={otherName}
        onBack={() => navigate("/inbox")}
        rightContent={
          <BookingLink to={`/booking/${bookingId}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </BookingLink>
        }
      />

      <MessagesContainer>
        {!canMessage ? (
          <LockedMessage>
            <LockIcon></LockIcon>
            <p>Chat unlocks after deposit is paid.</p>
          </LockedMessage>
        ) : messages.length === 0 ? (
          <EmptyMessages>
            <p>Say hi 👋</p>
          </EmptyMessages>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                $isOwn={msg.senderId === user?.uid}
                title={msg.createdAt?.toDate?.()?.toLocaleString?.() || ""}
              >
                <MessageText>{msg.message}</MessageText>
                <MessageTime>
                  {msg.createdAt?.toDate?.()?.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) || "Sending..."}
                </MessageTime>
              </MessageBubble>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </MessagesContainer>

      {showSafetyButton && (
        <SafetyWrap>
          <SafetyButton booking={booking} hasEmergencyContact={hasEmergencyContact} />
        </SafetyWrap>
      )}

      {canMessage && (
        <InputContainer onSubmit={handleSend}>
          <MessageInput
            as="textarea"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${otherName}…`}
            disabled={sending}
            rows={1}
          />
          <SendButton type="submit" disabled={!newMessage.trim() || sending}>
            {sending ? (
              <LoadingSpinner size={20} inline color="#1a1d21" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </SendButton>
        </InputContainer>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${({ theme }) => theme.bg};
`;

const BookingLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: ${({ theme }) => theme.muted};
  
  &:active {
    background: ${({ theme }) => theme.hoverDark};
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: ${({ theme }) => theme.bg};
`;

const SafetyWrap = styled.div`
  padding: 10px 16px;
  background: ${({ theme }) => theme.card};
  border-top: 1px solid ${({ theme }) => theme.border};
`;

const LockedMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: ${({ theme }) => theme.muted};
  
  p {
    margin: 0;
    max-width: 240px;
  }
`;

const LockIcon = styled.div`
  font-size: 40px;
  margin-bottom: 16px;
`;

const EmptyMessages = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  
  p {
    color: ${({ theme }) => theme.muted};
    text-align: center;
  }
`;

const MessageBubble = styled.div`
  max-width: 78%;
  padding: 10px 14px;
  border-radius: 18px;
  word-break: break-word;
  line-height: 1.35;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  align-self: ${({ $isOwn }) => ($isOwn ? "flex-end" : "flex-start")};
  background: ${({ $isOwn, theme }) => ($isOwn ? theme.primary : theme.card)};
  color: ${({ $isOwn, theme }) => ($isOwn ? "#1a1d21" : theme.text)};
  border: 1px solid
    ${({ $isOwn, theme }) => ($isOwn ? theme.primary : theme.border)};
  border-top-right-radius: ${({ $isOwn }) => ($isOwn ? "6px" : "18px")};
  border-top-left-radius: ${({ $isOwn }) => ($isOwn ? "18px" : "6px")};
`;

const MessageText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.4;
  word-wrap: break-word;
`;

const MessageTime = styled.span`
  display: block;
  font-size: 0.7rem;
  opacity: 0.8;
  margin-top: 4px;
  text-align: right;
`;

const InputContainer = styled.form`
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding: 10px 16px;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
  background: ${({ theme }) => theme.card};
  border-top: 1px solid ${({ theme }) => theme.border};
`;

const MessageInput = styled.input`
  flex: 1;
  min-height: 44px;
  max-height: 120px;
  padding: 10px 14px;
  background: ${({ theme }) => theme.bg};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  outline: none;
  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const SendButton = styled.button`
  padding: 10px 16px;
  border-radius: 12px;
  font-weight: 700;
  border: 1px solid ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:not(:disabled):active {
    opacity: 0.95;
  }
`;





