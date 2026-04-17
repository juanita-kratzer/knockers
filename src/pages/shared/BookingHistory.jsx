// src/pages/shared/BookingHistory.jsx
// Role-aware booking history: client sees their bookings, entertainer sees theirs

import { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../context/RoleContext";
import {
  useClientBookings,
  useEntertainerBookings,
  cancelBooking,
  BOOKING_STATUS,
} from "../../hooks/useBookings";
import { isStripeEnabled } from "../../lib/featureFlags";
import { cancelBookingWithFees } from "../../lib/stripeCallables";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import { logger } from "../../lib/logger";

function formatDate(dateValue) {
  if (!dateValue) return "Date TBA";
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getStatusLabel(status) {
  switch (status) {
    case BOOKING_STATUS.REQUESTED:
      return "Pending";
    case BOOKING_STATUS.ACCEPTED:
      return "Confirmed";
    case BOOKING_STATUS.DEPOSIT_PENDING:
      return "Awaiting payment";
    case BOOKING_STATUS.DEPOSIT_PAID:
      return "Deposit paid";
    case BOOKING_STATUS.IN_PROGRESS:
      return "In progress";
    case BOOKING_STATUS.COMPLETED:
      return "Completed";
    case BOOKING_STATUS.DECLINED:
      return "Declined";
    case BOOKING_STATUS.CANCELLED:
      return "Cancelled";
    case BOOKING_STATUS.EXPIRED:
      return "Expired";
    default:
      return status;
  }
}

export default function BookingHistory() {
  const { user } = useAuth();
  const { role } = useRole();
  const isEntertainer = role === "entertainer";

  const clientData = useClientBookings(!isEntertainer ? user?.uid : null);
  const entertainerData = useEntertainerBookings(isEntertainer ? user?.uid : null);

  const loading = isEntertainer ? entertainerData.loading : clientData.loading;
  const error = isEntertainer ? entertainerData.error : clientData.error;

  const [cancellingId, setCancellingId] = useState(null);
  const handleCancel = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancellingId(bookingId);
    try {
      if (isStripeEnabled()) {
        await cancelBookingWithFees(bookingId, "CLIENT", "Cancelled by client");
      } else {
        await cancelBooking(bookingId, "client", "Cancelled by client");
      }
    } catch (err) {
      logger.error("Failed to cancel:", err);
      alert(err?.message ?? "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Booking History" showBack />
        <LoadingWrap>
          <LoadingSpinner size={32} />
        </LoadingWrap>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Booking History" showBack />
        <ErrorMessage error={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  if (isEntertainer) {
    const { requests, pendingDeposit, confirmed, active, past } = entertainerData;
    const activeAll = [...pendingDeposit, ...confirmed, ...active];
    return (
      <PageContainer>
        <PageHeader title="Booking History" showBack />
        <Content>
          {activeAll.length === 0 && past.length === 0 ? (
            <EmptyCard>
              <EmptyText>No bookings yet</EmptyText>
              <EmptySubtext>Accepted and completed bookings will appear here</EmptySubtext>
            </EmptyCard>
          ) : (
            <>
              {activeAll.length > 0 && (
                <Section>
                  <SectionTitle>Active</SectionTitle>
                  <BookingList>
                    {activeAll.map((booking) => (
                      <BookingCard key={booking.id}>
                        <BookingHeader>
                          <PartyInfo>
                            <Avatar>{booking.clientName?.[0] || "C"}</Avatar>
                            <div>
                              <PartyName>{booking.clientName || "Client"}</PartyName>
                              <BookingDate>{formatDate(booking.eventDate)}</BookingDate>
                            </div>
                          </PartyInfo>
                          <StatusBadge $status={booking.status}>
                            {getStatusLabel(booking.status)}
                          </StatusBadge>
                        </BookingHeader>
                        <Actions>
                          <ViewButton to={`/booking/${booking.id}`}>View Details</ViewButton>
                          {[BOOKING_STATUS.DEPOSIT_PAID, BOOKING_STATUS.IN_PROGRESS].includes(booking.status) && (
                            <MessageButton to={`/inbox/${booking.id}`}>Message</MessageButton>
                          )}
                        </Actions>
                      </BookingCard>
                    ))}
                  </BookingList>
                </Section>
              )}
              {past.length > 0 && (
                <Section>
                  <SectionTitle>Past</SectionTitle>
                  <BookingList>
                    {past.map((booking) => (
                      <BookingCard key={booking.id} $faded>
                        <BookingHeader>
                          <PartyInfo>
                            <Avatar $faded>{booking.clientName?.[0] || "C"}</Avatar>
                            <div>
                              <PartyName>{booking.clientName || "Client"}</PartyName>
                              <BookingDate>{formatDate(booking.eventDate)}</BookingDate>
                            </div>
                          </PartyInfo>
                          <StatusBadge $status={booking.status}>
                            {getStatusLabel(booking.status)}
                          </StatusBadge>
                        </BookingHeader>
                        <Actions>
                          <ViewButton to={`/booking/${booking.id}`}>View Details</ViewButton>
                        </Actions>
                      </BookingCard>
                    ))}
                  </BookingList>
                </Section>
              )}
            </>
          )}
        </Content>
      </PageContainer>
    );
  }

  // Client view
  const { bookings } = clientData;
  const activeBookings = bookings.filter((b) =>
    [
      BOOKING_STATUS.REQUESTED,
      BOOKING_STATUS.ACCEPTED,
      BOOKING_STATUS.DEPOSIT_PENDING,
      BOOKING_STATUS.DEPOSIT_PAID,
      BOOKING_STATUS.IN_PROGRESS,
    ].includes(b.status)
  );
  const pastBookings = bookings.filter((b) =>
    [
      BOOKING_STATUS.COMPLETED,
      BOOKING_STATUS.DECLINED,
      BOOKING_STATUS.CANCELLED,
      BOOKING_STATUS.EXPIRED,
    ].includes(b.status)
  );

  return (
    <PageContainer>
      <PageHeader title="Booking History" showBack />
      <Content>
        {activeBookings.length === 0 && pastBookings.length === 0 ? (
          <EmptyCard>
            <EmptyText>No bookings yet</EmptyText>
            <EmptySubtext>Find an entertainer for your next event</EmptySubtext>
            <EmptyButton to="/explore">Browse Entertainers</EmptyButton>
          </EmptyCard>
        ) : (
          <>
            {activeBookings.length > 0 && (
              <Section>
                <SectionTitle>Active</SectionTitle>
                <BookingList>
                  {activeBookings.map((booking) => (
                    <BookingCard key={booking.id}>
                      <BookingHeader>
                        <PartyInfo>
                          <Avatar>{booking.entertainerName?.[0] || "E"}</Avatar>
                          <div>
                            <PartyName>{booking.entertainerName || "Entertainer"}</PartyName>
                            <BookingDate>{formatDate(booking.eventDate)}</BookingDate>
                          </div>
                        </PartyInfo>
                        <StatusBadge $status={booking.status}>
                          {getStatusLabel(booking.status)}
                        </StatusBadge>
                      </BookingHeader>
                      <Actions>
                        <ViewButton to={`/booking/${booking.id}`}>View Details</ViewButton>
                        {[BOOKING_STATUS.DEPOSIT_PAID, BOOKING_STATUS.IN_PROGRESS].includes(booking.status) && (
                          <MessageButton to={`/inbox/${booking.id}`}>Message</MessageButton>
                        )}
                        {booking.status === BOOKING_STATUS.REQUESTED && (
                          <CancelButton
                            onClick={() => handleCancel(booking.id)}
                            disabled={cancellingId === booking.id || booking.isFrozen}
                            title={booking.isFrozen ? "Booking under review" : undefined}
                          >
                            {cancellingId === booking.id ? "..." : booking.isFrozen ? "Under review" : "Cancel"}
                          </CancelButton>
                        )}
                      </Actions>
                    </BookingCard>
                  ))}
                </BookingList>
              </Section>
            )}
            {pastBookings.length > 0 && (
              <Section>
                <SectionTitle>Past</SectionTitle>
                <BookingList>
                  {pastBookings.map((booking) => (
                    <BookingCard key={booking.id} $faded>
                      <BookingHeader>
                        <PartyInfo>
                          <Avatar $faded>{booking.entertainerName?.[0] || "E"}</Avatar>
                          <div>
                            <PartyName>{booking.entertainerName || "Entertainer"}</PartyName>
                            <BookingDate>{formatDate(booking.eventDate)}</BookingDate>
                          </div>
                        </PartyInfo>
                        <StatusBadge $status={booking.status}>
                          {getStatusLabel(booking.status)}
                        </StatusBadge>
                      </BookingHeader>
                      <Actions>
                        <ViewButton to={`/booking/${booking.id}`}>View Details</ViewButton>
                        {booking.status === BOOKING_STATUS.COMPLETED && (
                          <ReviewLink to={`/talent/${booking.entertainerId}`}>Leave Review</ReviewLink>
                        )}
                      </Actions>
                    </BookingCard>
                  ))}
                </BookingList>
              </Section>
            )}
          </>
        )}
      </Content>
    </PageContainer>
  );
}

const LoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

const Content = styled.div`
  padding: 16px;
  padding-bottom: 100px;
`;

const Section = styled.section`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const EmptyCard = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
`;

const EmptyText = styled.h3`
  margin: 0 0 4px 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};
`;

const EmptySubtext = styled.p`
  margin: 0 0 20px 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
`;

const EmptyButton = styled(Link)`
  display: inline-block;
  padding: 12px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
`;

const BookingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const BookingCard = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  padding: 16px;
  opacity: ${({ $faded }) => ($faded ? 0.7 : 1)};
`;

const BookingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const PartyInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ $faded, theme }) => ($faded ? theme.dark : theme.hover)};
  color: ${({ theme }) => theme.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
`;

const PartyName = styled.h3`
  margin: 0 0 2px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const BookingDate = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const StatusBadge = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  background: ${({ $status }) =>
    $status === "requested" ? "rgba(251, 191, 36, 0.15)" :
    $status === "accepted" || $status === "deposit_pending" ? "rgba(34, 197, 94, 0.15)" :
    $status === "deposit_paid" || $status === "in_progress" ? "rgba(135, 206, 235, 0.15)" :
    $status === "completed" ? "rgba(135, 206, 235, 0.15)" :
    "rgba(239, 68, 68, 0.15)"};
  color: ${({ $status }) =>
    $status === "requested" ? "#fbbf24" :
    $status === "accepted" || $status === "deposit_pending" ? "#22c55e" :
    $status === "deposit_paid" || $status === "in_progress" ? "#87CEEB" :
    $status === "completed" ? "#87CEEB" :
    "#ef4444"};
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
`;

const ViewButton = styled(Link)`
  flex: 1;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  background: transparent;
  color: ${({ theme }) => theme.text};
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  text-decoration: none;
`;

const MessageButton = styled(Link)`
  flex: 1;
  padding: 12px;
  border: none;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  text-decoration: none;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  background: transparent;
  color: #ef4444;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
  }
`;

const ReviewLink = styled(Link)`
  flex: 1;
  padding: 12px;
  border: none;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  text-decoration: none;
`;
