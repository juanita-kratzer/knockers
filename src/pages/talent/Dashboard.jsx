// src/pages/talent/Dashboard.jsx
// Entertainer dashboard - manage bookings and profile

import { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { useMyEntertainerProfile } from "../../hooks/useEntertainers";
import { 
  useEntertainerBookings, 
  declineBooking,
  completeBooking,
  BOOKING_STATUS 
} from "../../hooks/useBookings";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import PromoBanner from "../../components/PromoBanner";
import { logger } from "../../lib/logger";

export default function TalentDashboard() {
  const { user } = useAuth();
  const { entertainer, loading: profileLoading } = useMyEntertainerProfile(user?.uid);
  const { pending, pendingDeposit, confirmed, active, past, loading: bookingsLoading, error } = useEntertainerBookings(user?.uid);
  const allActive = [...pendingDeposit, ...confirmed, ...active];
  
  const [activeTab, setActiveTab] = useState("requests");
  const [processingId, setProcessingId] = useState(null);

  const handleDecline = async (bookingId) => {
    const reason = prompt("Reason for declining (optional):");
    setProcessingId(bookingId);
    try {
      await declineBooking(bookingId, reason || "");
    } catch (err) {
      logger.error("Failed to decline:", err);
      alert("Failed to decline booking");
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (bookingId) => {
    if (!confirm("Mark this booking as completed?")) return;
    setProcessingId(bookingId);
    try {
      await completeBooking(bookingId);
    } catch (err) {
      logger.error("Failed to complete:", err);
      alert(err?.message ?? "Failed to complete booking");
    } finally {
      setProcessingId(null);
    }
  };

  const loading = profileLoading || bookingsLoading;

  if (loading) {
    return (
      <Container>
        <LoadingWrapper>
          <LoadingSpinner size={32} />
          <LoadingHint>Loading dashboard…</LoadingHint>
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

  // No profile yet - show create profile CTA
  if (!entertainer || typeof entertainer !== "object") {
    return (
      <Container>
        <EmptyState
          icon=""
          title="Complete Your Profile"
          message="Set up your entertainer profile to start receiving bookings"
          actionText="Create Profile"
          actionTo="/talent/edit"
        />
      </Container>
    );
  }

  const displayName = entertainer.displayName || "Entertainer";

  return (
    <Container>
      {/* Page heading */}
      <PageHeader>
        <PageTitle>Bookings</PageTitle>
      </PageHeader>

      <PromoBanner targetRole="entertainer" style={{ marginBottom: 16 }} />

      {/* Profile Summary */}
      <ProfileCard>
        <ProfileImage>
          {entertainer.photos?.[0] ? (
            <img src={entertainer.photos[0]} alt={displayName} />
          ) : (
            <Placeholder>{displayName[0] || "?"}</Placeholder>
          )}
        </ProfileImage>
        <ProfileInfo>
          <ProfileName>{displayName}</ProfileName>
          <ProfileStatus $active={entertainer.isActive}>
            {entertainer.isActive ? "Active" : "Hidden"}
          </ProfileStatus>
        </ProfileInfo>
        <EditButton to="/talent/edit">Edit Profile</EditButton>
      </ProfileCard>

      {/* Stats */}
      <StatsRow>
        <StatBox>
          <StatNumber>{pending.length}</StatNumber>
          <StatLabel>Pending</StatLabel>
        </StatBox>
        <StatBox>
          <StatNumber>{allActive.length}</StatNumber>
          <StatLabel>Active</StatLabel>
        </StatBox>
        <StatBox>
          <StatNumber>{entertainer.bookingCount || 0}</StatNumber>
          <StatLabel>Total</StatLabel>
        </StatBox>
        <StatBox>
          <StatNumber>{entertainer.rating?.toFixed(1) || "-"}</StatNumber>
          <StatLabel>Rating</StatLabel>
        </StatBox>
      </StatsRow>

      {/* Tabs */}
      <TabBar>
        <Tab 
          $active={activeTab === "requests"} 
          onClick={() => setActiveTab("requests")}
        >
          Requests {pending.length > 0 && <Badge>{pending.length}</Badge>}
        </Tab>
        <Tab 
          $active={activeTab === "active"} 
          onClick={() => setActiveTab("active")}
        >
          Active {allActive.length > 0 && <Badge>{allActive.length}</Badge>}
        </Tab>
        <Tab 
          $active={activeTab === "history"} 
          onClick={() => setActiveTab("history")}
        >
          History
        </Tab>
      </TabBar>

      {/* Tab Content */}
      <TabContent>
        {activeTab === "requests" && (
          pending.length === 0 ? (
            <EmptyState
              icon=""
              title="No pending requests"
              message="New booking requests will appear here"
            />
          ) : (
            <BookingList>
              {pending.map((booking) => (
                <BookingCard key={booking.id}>
                  <BookingHeader>
                    <BookingClient>{booking.clientName || "Client"}</BookingClient>
                    <BookingDate>{formatDate(booking.eventDate)}</BookingDate>
                  </BookingHeader>
                  <BookingDetails>
                    <DetailRow>
                      <DetailLabel>Location</DetailLabel>
                      <DetailValue>{booking.location || "TBA"}</DetailValue>
                    </DetailRow>
                    <DetailRow>
                      <DetailLabel>Time</DetailLabel>
                      <DetailValue>{booking.eventTime || "TBA"}</DetailValue>
                    </DetailRow>
                    {booking.notes && (
                      <DetailRow>
                        <DetailLabel>Notes</DetailLabel>
                        <DetailValue>{booking.notes}</DetailValue>
                      </DetailRow>
                    )}
                  </BookingDetails>
                  <BookingActions>
                    <DeclineButton 
                      onClick={() => handleDecline(booking.id)}
                      disabled={processingId === booking.id}
                    >
                      Decline
                    </DeclineButton>
                    <AcceptButton as={Link} to={`/talent/bookings/${booking.id}/accept`}>
                      Accept
                    </AcceptButton>
                  </BookingActions>
                </BookingCard>
              ))}
            </BookingList>
          )
        )}

        {activeTab === "active" && (
          allActive.length === 0 ? (
            <EmptyState
              icon=""
              title="No active bookings"
              message="Accepted bookings will appear here"
            />
          ) : (
            <BookingList>
              {allActive.map((booking) => (
                <BookingCard key={booking.id}>
                  <BookingHeader>
                    <BookingClient>{booking.clientName || "Client"}</BookingClient>
                    <BookingStatus $status="accepted">Accepted</BookingStatus>
                  </BookingHeader>
                  <BookingDetails>
                    <DetailRow>
                      <DetailLabel>Date</DetailLabel>
                      <DetailValue>{formatDate(booking.eventDate)}</DetailValue>
                    </DetailRow>
                    <DetailRow>
                      <DetailLabel>Location</DetailLabel>
                      <DetailValue>{booking.location || "TBA"}</DetailValue>
                    </DetailRow>
                  </BookingDetails>
                  <BookingActions>
                    <MessageButton to={`/inbox/${booking.id}`}>
                      Message
                    </MessageButton>
                    <CompleteButton 
                      onClick={() => handleComplete(booking.id)}
                      disabled={processingId === booking.id || booking.isFrozen}
                      title={booking.isFrozen ? "Booking under review" : undefined}
                    >
                      {booking.isFrozen ? "Under review" : "Mark Complete"}
                    </CompleteButton>
                  </BookingActions>
                </BookingCard>
              ))}
            </BookingList>
          )
        )}

        {activeTab === "history" && (
          past.length === 0 ? (
            <EmptyState
              icon=""
              title="No booking history"
              message="Completed bookings will appear here"
            />
          ) : (
            <BookingList>
              {past.map((booking) => (
                <BookingCard key={booking.id} $faded>
                  <BookingHeader>
                    <BookingClient>{booking.clientName || "Client"}</BookingClient>
                    <BookingStatus $status={booking.status}>
                      {booking.status}
                    </BookingStatus>
                  </BookingHeader>
                  <BookingDetails>
                    <DetailRow>
                      <DetailLabel>Date</DetailLabel>
                      <DetailValue>{formatDate(booking.eventDate)}</DetailValue>
                    </DetailRow>
                  </BookingDetails>
                </BookingCard>
              ))}
            </BookingList>
          )
        )}
      </TabContent>
    </Container>
  );
}

function formatDate(dateValue) {
  if (!dateValue) return "TBD";
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-AU", { 
    weekday: "short",
    month: "short", 
    day: "numeric",
    year: "numeric"
  });
}

const Container = styled.div`
  min-height: 100%;
  min-height: 100dvh;
  min-height: 100vh;
  background: ${({ theme }) => theme.bg};
  padding-bottom: 100px;
`;

const PageHeader = styled.header`
  padding: 20px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  min-height: 40vh;
`;

const LoadingHint = styled.p`
  margin: 16px 0 0 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
`;

const ProfileCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const ProfileImage = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: ${({ theme }) => theme.card};
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.card};
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const ProfileName = styled.h2`
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const ProfileStatus = styled.span`
  font-size: 0.8rem;
  color: ${({ $active }) => $active ? "#22c55e" : "#9ca3af"};
`;

const EditButton = styled(Link)`
  padding: 10px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  color: ${({ theme }) => theme.text};
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
`;

const StatsRow = styled.div`
  display: flex;
  padding: 16px;
  gap: 12px;
`;

const StatBox = styled.div`
  flex: 1;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.muted};
  text-transform: uppercase;
  margin-top: 4px;
`;

const TabBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 16px;
`;

const Tab = styled.button`
  flex: 1;
  padding: 10px 8px;
  border: 1px solid ${({ $active, theme }) => $active ? theme.primary : theme.border};
  background: ${({ $active, theme }) => $active ? `${theme.primary}15` : "transparent"};
  color: ${({ $active, theme }) => $active ? theme.primary : theme.muted};
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 50px;
`;

const Badge = styled.span`
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
`;

const TabContent = styled.div`
  padding: 16px;
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
  align-items: center;
  margin-bottom: 12px;
`;

const BookingClient = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const BookingDate = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.primary};
  font-weight: 500;
`;

const BookingStatus = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  padding: 4px 10px;
  border-radius: 8px;
  background: ${({ $status }) => 
    $status === "accepted" ? "rgba(34, 197, 94, 0.15)" :
    $status === "completed" ? "rgba(135, 206, 235, 0.15)" :
    $status === "declined" ? "rgba(239, 68, 68, 0.15)" :
    "rgba(255, 255, 255, 0.1)"
  };
  color: ${({ $status }) => 
    $status === "accepted" ? "#22c55e" :
    $status === "completed" ? "#87CEEB" :
    $status === "declined" ? "#ef4444" :
    "#9ca3af"
  };
`;

const BookingDetails = styled.div`
  margin-bottom: 16px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
`;

const DetailLabel = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const DetailValue = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.text};
  text-align: right;
`;

const BookingActions = styled.div`
  display: flex;
  gap: 10px;
`;

const DeclineButton = styled.button`
  flex: 1;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  background: transparent;
  color: ${({ theme }) => theme.text};
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
  }
`;

const AcceptButton = styled.button`
  flex: 1;
  padding: 12px;
  border: none;
  background: #22c55e;
  color: white;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
  }
`;

const MessageButton = styled(Link)`
  flex: 1;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  background: transparent;
  color: ${({ theme }) => theme.text};
  border-radius: 10px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
`;

const CompleteButton = styled.button`
  flex: 1;
  padding: 12px;
  border: none;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
  }
`;
