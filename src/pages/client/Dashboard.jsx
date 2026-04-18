// src/pages/client/Dashboard.jsx
// Client dashboard - view and manage bookings

import { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { useClientBookings, cancelBooking, BOOKING_STATUS } from "../../hooks/useBookings";
import { isStripeEnabled } from "../../lib/featureFlags";
import { cancelBookingWithFees } from "../../lib/stripeCallables";
import { useClientListings, LISTING_STATUS } from "../../hooks/useListings";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import PromoBanner from "../../components/PromoBanner";
import { logger } from "../../lib/logger";

export default function ClientDashboard() {
  const { user, userData } = useAuth();
  const { bookings, loading, error } = useClientBookings(user?.uid);
  const { listings } = useClientListings(user?.uid);
  const [cancellingId, setCancellingId] = useState(null);

  const openListings = listings.filter((l) => l.status === LISTING_STATUS.OPEN);

  const handleCancel = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    const reason = "Cancelled by client";
    setCancellingId(bookingId);
    try {
      if (isStripeEnabled()) {
        await cancelBookingWithFees(bookingId, "CLIENT", reason);
      } else {
        await cancelBooking(bookingId, "client", reason);
      }
    } catch (err) {
      logger.error("Failed to cancel:", err);
      alert(err?.message ?? "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  // Categorize bookings (include DEPOSIT_PENDING / DEPOSIT_PAID / IN_PROGRESS so client can pay or message)
  const activeBookings = bookings.filter(b =>
    [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.DEPOSIT_PENDING, BOOKING_STATUS.DEPOSIT_PAID, BOOKING_STATUS.IN_PROGRESS].includes(b.status)
  );
  const pastBookings = bookings.filter(b =>
    [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.DECLINED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.EXPIRED].includes(b.status)
  );

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
      {/* Page heading */}
      <Header>
        <PageTitle>Bookings</PageTitle>
        <Greeting>
          <GreetingText>Welcome back,</GreetingText>
          <UserName>{userData?.name || "Guest"}</UserName>
        </Greeting>
      </Header>

      <PromoBanner targetRole="client" style={{ marginBottom: 16 }} />

      {/* My Listings */}
      <Section>
        <SectionHeader>
          <SectionTitle>My Listings</SectionTitle>
          <PostListingButton to="/client/listings/new">Post a listing</PostListingButton>
        </SectionHeader>
        {openListings.length === 0 ? (
          <EmptyCard $compact>
            <EmptySubtext>Post what you need — entertainers can apply and you choose who to book.</EmptySubtext>
            <EmptyButton to="/client/listings/new">Post a listing</EmptyButton>
          </EmptyCard>
        ) : (
          <BookingList>
            {openListings.map((listing) => (
              <ListingCard key={listing.id} to={`/client/listings/${listing.id}`}>
                <ListingTitle>{listing.title || "Untitled"}</ListingTitle>
                <ListingMeta>
                  {listing.location && `${listing.location}`}
                  {listing.eventDate && ` · ${formatDate(listing.eventDate)}`}
                </ListingMeta>
              </ListingCard>
            ))}
          </BookingList>
        )}
      </Section>

      {/* Active Bookings */}
      <Section>
        <SectionHeader>
          <SectionTitle>Active Bookings</SectionTitle>
          {activeBookings.length > 0 && (
            <SectionCount>{activeBookings.length}</SectionCount>
          )}
        </SectionHeader>

        {activeBookings.length === 0 ? (
          <EmptyCard>
            <EmptyIcon></EmptyIcon>
            <EmptyText>No active bookings</EmptyText>
            <EmptySubtext>Find an entertainer for your next event</EmptySubtext>
            <EmptyButton to="/">Browse Entertainers</EmptyButton>
          </EmptyCard>
        ) : (
          <BookingList>
            {activeBookings.map((booking) => (
              <BookingCard key={booking.id}>
                <BookingHeader>
                  <EntertainerInfo>
                    <EntertainerAvatar>
                      {booking.entertainerName?.[0] || "E"}
                    </EntertainerAvatar>
                    <div>
                      <EntertainerName>{booking.entertainerName || "Entertainer"}</EntertainerName>
                      <BookingDate>{formatDate(booking.eventDate)}</BookingDate>
                    </div>
                  </EntertainerInfo>
                  <BookingStatus $status={booking.status}>
                    {getStatusLabel(booking.status)}
                  </BookingStatus>
                </BookingHeader>

                <BookingDetails>
                  <DetailItem>
                    <DetailIcon></DetailIcon>
                    <DetailText>{booking.location || "Location TBA"}</DetailText>
                  </DetailItem>
                  <DetailItem>
                    <DetailIcon></DetailIcon>
                    <DetailText>{booking.eventTime || "Time TBA"}</DetailText>
                  </DetailItem>
                </BookingDetails>

                <BookingActions>
                  <ViewButton to={`/booking/${booking.id}`}>
                    View Details
                  </ViewButton>
                  {[BOOKING_STATUS.DEPOSIT_PAID, BOOKING_STATUS.IN_PROGRESS].includes(booking.status) && (
                    <MessageButton to={`/inbox/${booking.id}`}>
                      Message
                    </MessageButton>
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
                </BookingActions>
              </BookingCard>
            ))}
          </BookingList>
        )}
      </Section>

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <Section>
          <SectionHeader>
            <SectionTitle>Past Bookings</SectionTitle>
          </SectionHeader>

          <BookingList>
            {pastBookings.map((booking) => (
              <BookingCard key={booking.id} $faded>
                <BookingHeader>
                  <EntertainerInfo>
                    <EntertainerAvatar $faded>
                      {booking.entertainerName?.[0] || "E"}
                    </EntertainerAvatar>
                    <div>
                      <EntertainerName>{booking.entertainerName || "Entertainer"}</EntertainerName>
                      <BookingDate>{formatDate(booking.eventDate)}</BookingDate>
                    </div>
                  </EntertainerInfo>
                  <BookingStatus $status={booking.status}>
                    {getStatusLabel(booking.status)}
                  </BookingStatus>
                </BookingHeader>

                <BookingActions>
                  <ViewButton to={`/booking/${booking.id}`}>
                    View Details
                  </ViewButton>
                  {booking.status === BOOKING_STATUS.COMPLETED && (
                    <ReviewButton to={`/talent/${booking.entertainerId}`}>
                      Leave Review
                    </ReviewButton>
                  )}
                </BookingActions>
              </BookingCard>
            ))}
          </BookingList>
        </Section>
      )}
    </Container>
  );
}

function formatDate(dateValue) {
  if (!dateValue) return "Date TBA";
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-AU", { 
    weekday: "short",
    month: "short", 
    day: "numeric"
  });
}

function getStatusLabel(status) {
  switch (status) {
    case BOOKING_STATUS.REQUESTED: return "Pending";
    case BOOKING_STATUS.ACCEPTED: return "Confirmed";
    case BOOKING_STATUS.COMPLETED: return "Completed";
    case BOOKING_STATUS.DECLINED: return "Declined";
    case BOOKING_STATUS.CANCELLED: return "Cancelled";
    default: return status;
  }
}

const Container = styled.div`
  min-height: 100%;
  background: ${({ theme }) => theme.bg};
  padding-bottom: 100px;
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

const Header = styled.header`
  padding: 20px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const PageTitle = styled.h1`
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const Greeting = styled.div``;

const GreetingText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const UserName = styled.span`
  margin: 4px 0 0 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.muted};
`;

const Section = styled.section`
  padding: 20px 16px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const SectionCount = styled.span`
  padding: 4px 10px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 12px;
`;

const EmptyCard = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 20px;
  padding: ${({ $compact }) => ($compact ? "20px 24px" : "32px 24px")};
  text-align: center;
`;

const PostListingButton = styled(Link)`
  margin-left: auto;
  padding: 8px 14px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
`;

const ListingCard = styled(Link)`
  display: block;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  padding: 16px;
  text-decoration: none;
  color: inherit;
`;

const ListingTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const ListingMeta = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const EmptyIcon = styled.div`
  font-size: 40px;
  margin-bottom: 12px;
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
  opacity: ${({ $faded }) => $faded ? 0.7 : 1};
`;

const BookingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const EntertainerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const EntertainerAvatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ $faded, theme }) => $faded ? theme.dark : theme.hover};
  color: ${({ theme }) => theme.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
`;

const EntertainerName = styled.h3`
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

const BookingStatus = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  background: ${({ $status }) => 
    $status === "requested" ? "rgba(251, 191, 36, 0.15)" :
    $status === "accepted" ? "rgba(34, 197, 94, 0.15)" :
    $status === "completed" ? "rgba(135, 206, 235, 0.15)" :
    $status === "declined" || $status === "cancelled" ? "rgba(239, 68, 68, 0.15)" :
    "rgba(255, 255, 255, 0.1)"
  };
  color: ${({ $status }) => 
    $status === "requested" ? "#fbbf24" :
    $status === "accepted" ? "#22c55e" :
    $status === "completed" ? "#87CEEB" :
    $status === "declined" || $status === "cancelled" ? "#ef4444" :
    "#9ca3af"
  };
`;

const BookingDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: ${({ theme }) => theme.bg};
  border-radius: 10px;
`;

const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DetailIcon = styled.span`
  font-size: 1rem;
`;

const DetailText = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};
`;

const BookingActions = styled.div`
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

const ReviewButton = styled(Link)`
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
