// src/pages/talent/Activity.jsx
// Entertainer activity page - upcoming bookings, area stats, activity overview

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { 
  Calendar, 
  MapPin, 
  Users, 
  TrendingUp, 
  Clock,
  ChevronRight,
  Star
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMyEntertainerProfile } from "../../hooks/useEntertainers";
import { useEntertainerBookings, BOOKING_STATUS } from "../../hooks/useBookings";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";

export default function Activity() {
  const { user } = useAuth();
  const { entertainer, loading: profileLoading } = useMyEntertainerProfile(user?.uid);
  const { pending, pendingDeposit, confirmed, active, past, loading: bookingsLoading } = useEntertainerBookings(user?.uid);
  
  const loading = profileLoading || bookingsLoading;

  const upcomingBookings = [...pendingDeposit, ...confirmed, ...active].sort((a, b) => {
    const dateA = a.eventDate?.toDate?.() || new Date(a.eventDate);
    const dateB = b.eventDate?.toDate?.() || new Date(b.eventDate);
    return dateA - dateB;
  });

  // Get next booking
  const nextBooking = upcomingBookings[0];

  // Calculate stats
  const thisMonthCompleted = past.filter(b => {
    if (b.status !== BOOKING_STATUS.COMPLETED) return false;
    const completedDate = b.completedAt?.toDate?.() || new Date(b.completedAt);
    const now = new Date();
    return completedDate.getMonth() === now.getMonth() && 
           completedDate.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return (
      <Container>
        <LoadingWrapper>
          <LoadingSpinner size={32} />
        </LoadingWrapper>
      </Container>
    );
  }

  if (!entertainer) {
    return (
      <Container>
        <EmptyState
          icon=""
          title="Complete Your Profile"
          message="Set up your entertainer profile to see your activity"
          actionText="Create Profile"
          actionTo="/talent/edit"
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <PageTitle>Activity</PageTitle>
      </Header>

      {/* Next Booking Card */}
      {nextBooking ? (
        <Section>
          <SectionTitle>
            <Calendar size={18} />
            Next Booking
          </SectionTitle>
          <NextBookingCard to={`/booking/${nextBooking.id}`}>
            <BookingInfo>
              <BookingClient>{nextBooking.clientName || "Client"}</BookingClient>
              <BookingDateTime>
                <Clock size={14} />
                {formatDateTime(nextBooking.eventDate, nextBooking.eventTime)}
              </BookingDateTime>
              <BookingLocation>
                <MapPin size={14} />
                {nextBooking.location || nextBooking.suburb || "Location TBA"}
              </BookingLocation>
            </BookingInfo>
            <ChevronRight size={20} />
          </NextBookingCard>
        </Section>
      ) : (
        <Section>
          <SectionTitle>
            <Calendar size={18} />
            Next Booking
          </SectionTitle>
          <EmptyCard>
            <EmptyText>No upcoming bookings</EmptyText>
            <EmptySubtext>Accepted bookings will appear here</EmptySubtext>
          </EmptyCard>
        </Section>
      )}

      {/* Upcoming Schedule */}
      {upcomingBookings.length > 1 && (
        <Section>
          <SectionTitle>
            <TrendingUp size={18} />
            Upcoming Schedule
          </SectionTitle>
          <ScheduleList>
            {upcomingBookings.slice(1, 5).map((booking) => (
              <ScheduleItem key={booking.id} to={`/booking/${booking.id}`}>
                <ScheduleDate>
                  {formatShortDate(booking.eventDate)}
                </ScheduleDate>
                <ScheduleDetails>
                  <ScheduleClient>{booking.clientName || "Client"}</ScheduleClient>
                  <ScheduleLocation>{booking.suburb || booking.location || "TBA"}</ScheduleLocation>
                </ScheduleDetails>
                <ScheduleStatus $status={booking.status}>
                  {getStatusLabel(booking.status)}
                </ScheduleStatus>
              </ScheduleItem>
            ))}
          </ScheduleList>
        </Section>
      )}

      {/* Stats Overview */}
      <Section>
        <SectionTitle>
          <Star size={18} />
          Your Stats
        </SectionTitle>
        <StatsGrid>
          <StatCard>
            <StatIcon><Calendar size={20} /></StatIcon>
            <StatContent>
              <StatValue>{pending.length}</StatValue>
              <StatLabel>Pending Requests</StatLabel>
            </StatContent>
          </StatCard>
          
          <StatCard>
            <StatIcon><Clock size={20} /></StatIcon>
            <StatContent>
              <StatValue>{upcomingBookings.length}</StatValue>
              <StatLabel>Upcoming Gigs</StatLabel>
            </StatContent>
          </StatCard>
          
          <StatCard>
            <StatIcon><TrendingUp size={20} /></StatIcon>
            <StatContent>
              <StatValue>{thisMonthCompleted}</StatValue>
              <StatLabel>This Month</StatLabel>
            </StatContent>
          </StatCard>
          
          <StatCard>
            <StatIcon><Star size={20} /></StatIcon>
            <StatContent>
              <StatValue>{entertainer.rating?.toFixed(1) || "-"}</StatValue>
              <StatLabel>Rating</StatLabel>
            </StatContent>
          </StatCard>
        </StatsGrid>
      </Section>

      {/* Area Activity */}
      <Section>
        <SectionTitle>
          <Users size={18} />
          Area Activity
        </SectionTitle>
        <AreaCard>
          <AreaInfo>
            <AreaLocation>
              <MapPin size={16} />
              {entertainer.suburb || "Your Area"}
            </AreaLocation>
            <AreaDescription>
              Stay active to appear higher in search results for your area
            </AreaDescription>
          </AreaInfo>
          <ProfileStatus $active={entertainer.isActive}>
            {entertainer.isActive ? "Visible" : "Hidden"}
          </ProfileStatus>
        </AreaCard>
        
        {!entertainer.isActive && (
          <ActivateBanner>
            <BannerText>
              Your profile is hidden. Activate it to start receiving booking requests.
            </BannerText>
            <ActivateLink to="/talent/edit">Activate Profile</ActivateLink>
          </ActivateBanner>
        )}
      </Section>

      {/* Quick Actions */}
      <Section>
        <QuickActions>
          <QuickAction to="/talent">
            View All Jobs
            <ChevronRight size={18} />
          </QuickAction>
          <QuickAction to="/finances">
            View Earnings
            <ChevronRight size={18} />
          </QuickAction>
          <QuickAction to="/talent/edit">
            Edit Profile
            <ChevronRight size={18} />
          </QuickAction>
        </QuickActions>
      </Section>
    </Container>
  );
}

function formatDateTime(dateValue, timeValue) {
  if (!dateValue) return "Date TBA";
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  if (isNaN(date.getTime())) return "Invalid date";
  const dateStr = date.toLocaleDateString("en-AU", { 
    weekday: "short",
    month: "short", 
    day: "numeric"
  });
  return timeValue ? `${dateStr} at ${timeValue}` : dateStr;
}

function formatShortDate(dateValue) {
  if (!dateValue) return "TBA";
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-AU", { 
    month: "short", 
    day: "numeric"
  });
}

function getStatusLabel(status) {
  switch (status) {
    case BOOKING_STATUS.ACCEPTED: return "Accepted";
    case BOOKING_STATUS.DEPOSIT_PAID: return "Confirmed";
    case BOOKING_STATUS.IN_PROGRESS: return "In Progress";
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

const Header = styled.div`
  padding: 20px 16px 12px;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const Section = styled.section`
  padding: 0 16px 24px;
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.muted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  svg {
    color: ${({ theme }) => theme.primary};
  }
`;

const NextBookingCard = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: linear-gradient(135deg, ${({ theme }) => theme.primary}20, ${({ theme }) => theme.primary}10);
  border: 1px solid ${({ theme }) => theme.primary}40;
  border-radius: 16px;
  text-decoration: none;
  
  svg:last-child {
    color: ${({ theme }) => theme.primary};
  }
`;

const BookingInfo = styled.div`
  flex: 1;
`;

const BookingClient = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const BookingDateTime = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.primary};
  margin-bottom: 4px;
`;

const BookingLocation = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const EmptyCard = styled.div`
  padding: 24px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  text-align: center;
`;

const EmptyText = styled.p`
  margin: 0 0 4px 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};
`;

const EmptySubtext = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const ScheduleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ScheduleItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  text-decoration: none;
`;

const ScheduleDate = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.primary};
  min-width: 60px;
`;

const ScheduleDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const ScheduleClient = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.text};
`;

const ScheduleLocation = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;

const ScheduleStatus = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  background: ${({ $status }) => 
    $status === BOOKING_STATUS.DEPOSIT_PAID ? "rgba(34, 197, 94, 0.15)" :
    "rgba(135, 206, 235, 0.15)"
  };
  color: ${({ $status }) => 
    $status === BOOKING_STATUS.DEPOSIT_PAID ? "#22c55e" :
    "#87CEEB"
  };
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 14px;
`;

const StatIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ theme }) => theme.bg};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.primary};
`;

const StatContent = styled.div``;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.muted};
`;

const AreaCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 14px;
`;

const AreaInfo = styled.div`
  flex: 1;
`;

const AreaLocation = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin-bottom: 4px;
  
  svg {
    color: ${({ theme }) => theme.primary};
  }
`;

const AreaDescription = styled.p`
  margin: 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;

const ProfileStatus = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  background: ${({ $active }) => $active ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)"};
  color: ${({ $active }) => $active ? "#22c55e" : "#ef4444"};
`;

const ActivateBanner = styled.div`
  margin-top: 12px;
  padding: 14px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const BannerText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.text};
  flex: 1;
`;

const ActivateLink = styled(Link)`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.primary};
  text-decoration: none;
  white-space: nowrap;
`;

const QuickActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const QuickAction = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-weight: 500;
  text-decoration: none;
  
  svg {
    color: ${({ theme }) => theme.muted};
  }
  
  &:active {
    background: ${({ theme }) => theme.hoverDark};
  }
`;
