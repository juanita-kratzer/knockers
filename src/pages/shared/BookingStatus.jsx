// src/pages/shared/BookingStatus.jsx
// View booking details and status

import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import { useBooking, BOOKING_STATUS, generateArrivalCode, initiateDepositPayment } from "../../hooks/useBookings";
import { useEntertainer } from "../../hooks/useEntertainers";
import { isStripeEnabled } from "../../lib/featureFlags";
import { PLATFORM_FEE_DOLLARS } from "../../lib/policies";
import { createDepositPaymentIntent } from "../../lib/stripeCallables";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import DepositPaymentForm from "../../components/DepositPaymentForm";
import ArrivalCodeEntry from "../../components/ArrivalCodeEntry";
import SafetyButton from "../../components/SafetyButton";
import {
  Calendar,
  Clock,
  Timer,
  MapPin,
  FileText,
  DollarSign,
  MessageCircle,
  Clock3,
  CheckCircle,
  XCircle,
  PartyPopper,
  Ban,
  HelpCircle,
} from "lucide-react";

export default function BookingStatus() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { booking, loading, error } = useBooking(bookingId);
  const { entertainer } = useEntertainer(booking?.entertainerId);
  const [rulesAgreed, setRulesAgreed] = useState(false);
  const [cancellationAgreed, setCancellationAgreed] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [codeGenerating, setCodeGenerating] = useState(false);
  const [showArrivalModal, setShowArrivalModal] = useState(false);

  if (loading) {
    return (
      <Container>
        <LoadingWrapper>
          <LoadingSpinner size={32} />
        </LoadingWrapper>
      </Container>
    );
  }

  if (error || !booking) {
    return (
      <Container>
        <ErrorMessage 
          title="Booking not found"
          error="This booking doesn't exist or you don't have access to it."
        />
      </Container>
    );
  }

  const isClient = booking.clientId === user?.uid;
  const isEntertainer = booking.entertainerId === user?.uid;
  const isFrozen = !!booking.isFrozen;
  const canMessage = [BOOKING_STATUS.DEPOSIT_PAID, BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.COMPLETED].includes(booking.status) ||
    (!isStripeEnabled() && booking.status === BOOKING_STATUS.ACCEPTED);

  const showDepositFlow =
    !isFrozen &&
    isStripeEnabled() &&
    isClient &&
    (booking.status === BOOKING_STATUS.ACCEPTED || booking.status === BOOKING_STATUS.DEPOSIT_PENDING) &&
    booking.paymentStatus !== "DEPOSIT_PAID";
  const showPaymentProcessing =
    showDepositFlow &&
    (booking.paymentStatus === "PAYMENT_INTENT_CREATED" || paymentSubmitted);
  const canShowPaymentForm = showDepositFlow && !showPaymentProcessing && rulesAgreed && cancellationAgreed;

  return (
    <Container>
      <PageHeader
        title="Booking Details"
        onBack={() => navigate(isEntertainer ? "/talent" : "/client")}
      />

      {/* Frozen: under review */}
      {isFrozen && (
        <FrozenBanner>
          <Ban size={20} />
          <span>Booking under review. Actions are disabled until an admin resolves this.</span>
        </FrozenBanner>
      )}

      {/* Status Banner */}
      <StatusBanner $status={booking.status}>
        <StatusIcon>{getStatusIcon(booking.status)}</StatusIcon>
        <StatusText>
          <StatusLabel>{getStatusLabel(booking.status)}</StatusLabel>
          <StatusDescription>{getStatusDescription(booking.status, isClient)}</StatusDescription>
        </StatusText>
      </StatusBanner>

      {/* Entertainer / Client Info */}
      <InfoCard>
        <InfoHeader>
          <InfoAvatar>
            {isClient ? (
              entertainer?.photos?.[0] ? (
                <img src={entertainer.photos[0]} alt={entertainer.displayName} />
              ) : (
                booking.entertainerName?.[0] || "E"
              )
            ) : (
              booking.clientName?.[0] || "C"
            )}
          </InfoAvatar>
          <InfoDetails>
            <InfoName>
              {isClient ? booking.entertainerName : booking.clientName}
            </InfoName>
            <InfoRole>{isClient ? "Entertainer" : "Client"}</InfoRole>
          </InfoDetails>
          {isClient && (
            <ViewProfileButton to={`/talent/${booking.entertainerId}`}>
              View Profile
            </ViewProfileButton>
          )}
        </InfoHeader>
      </InfoCard>

      {/* Booking Details */}
      <DetailsCard>
        <DetailsTitle>Event Details</DetailsTitle>
        
        <DetailRow>
          <DetailIconWrapper><Calendar size={18} /></DetailIconWrapper>
          <DetailContent>
            <DetailLabel>Date</DetailLabel>
            <DetailValue>{formatDate(booking.eventDate)}</DetailValue>
          </DetailContent>
        </DetailRow>

        <DetailRow>
          <DetailIconWrapper><Clock size={18} /></DetailIconWrapper>
          <DetailContent>
            <DetailLabel>Time</DetailLabel>
            <DetailValue>{booking.eventTime || "To be confirmed"}</DetailValue>
          </DetailContent>
        </DetailRow>

        <DetailRow>
          <DetailIconWrapper><Timer size={18} /></DetailIconWrapper>
          <DetailContent>
            <DetailLabel>Duration</DetailLabel>
            <DetailValue>{booking.duration ? `${booking.duration} hours` : "To be confirmed"}</DetailValue>
          </DetailContent>
        </DetailRow>

        <DetailRow>
          <DetailIconWrapper><MapPin size={18} /></DetailIconWrapper>
          <DetailContent>
            <DetailLabel>Location</DetailLabel>
            <DetailValue>{booking.location || "To be confirmed"}</DetailValue>
          </DetailContent>
        </DetailRow>

        {booking.notes && (
          <DetailRow>
            <DetailIconWrapper><FileText size={18} /></DetailIconWrapper>
            <DetailContent>
              <DetailLabel>Notes</DetailLabel>
              <DetailValue>{booking.notes}</DetailValue>
            </DetailContent>
          </DetailRow>
        )}

        {booking.estimatedCost && (
          <DetailRow>
            <DetailIconWrapper><DollarSign size={18} /></DetailIconWrapper>
            <DetailContent>
              <DetailLabel>Estimated Cost</DetailLabel>
              <DetailValue>${booking.estimatedCost}</DetailValue>
            </DetailContent>
          </DetailRow>
        )}
      </DetailsCard>

      {/* Timeline */}
      <TimelineCard>
        <TimelineTitle>Timeline</TimelineTitle>
        
        <TimelineItem $completed>
          <TimelineDot $completed />
          <TimelineContent>
            <TimelineEvent>Booking Requested</TimelineEvent>
            <TimelineDate>{formatDateTime(booking.createdAt)}</TimelineDate>
          </TimelineContent>
        </TimelineItem>

        {booking.acceptedAt && (
          <TimelineItem $completed>
            <TimelineDot $completed />
            <TimelineContent>
              <TimelineEvent>Booking Accepted</TimelineEvent>
              <TimelineDate>{formatDateTime(booking.acceptedAt)}</TimelineDate>
            </TimelineContent>
          </TimelineItem>
        )}

        {booking.declinedAt && (
          <TimelineItem $completed $declined>
            <TimelineDot $completed $declined />
            <TimelineContent>
              <TimelineEvent>Booking Declined</TimelineEvent>
              <TimelineDate>{formatDateTime(booking.declinedAt)}</TimelineDate>
              {booking.declineReason && (
                <TimelineNote>Reason: {booking.declineReason}</TimelineNote>
              )}
            </TimelineContent>
          </TimelineItem>
        )}

        {booking.cancelledAt && (
          <TimelineItem $completed $declined>
            <TimelineDot $completed $declined />
            <TimelineContent>
              <TimelineEvent>Booking Cancelled</TimelineEvent>
              <TimelineDate>{formatDateTime(booking.cancelledAt)}</TimelineDate>
            </TimelineContent>
          </TimelineItem>
        )}

        {booking.completedAt && (
          <TimelineItem $completed>
            <TimelineDot $completed />
            <TimelineContent>
              <TimelineEvent>Booking Completed</TimelineEvent>
              <TimelineDate>{formatDateTime(booking.completedAt)}</TimelineDate>
            </TimelineContent>
          </TimelineItem>
        )}

        {booking.status === BOOKING_STATUS.REQUESTED && (
          <TimelineItem>
            <TimelineDot />
            <TimelineContent>
              <TimelineEvent>Awaiting Response</TimelineEvent>
            </TimelineContent>
          </TimelineItem>
        )}

        {booking.status === BOOKING_STATUS.ACCEPTED && !booking.completedAt && (
          <TimelineItem>
            <TimelineDot />
            <TimelineContent>
              <TimelineEvent>Event Pending</TimelineEvent>
            </TimelineContent>
          </TimelineItem>
        )}
      </TimelineCard>

      {/* Phase 1: Client deposit payment (Stripe) */}
      {showDepositFlow && (
        <DepositCard>
          <DepositTitle>Pay deposit</DepositTitle>
          {showPaymentProcessing ? (
            <PaymentProcessing>
              <LoadingSpinner size={24} />
              <span>Payment processing… We’ll confirm when the deposit is received.</span>
            </PaymentProcessing>
          ) : !rulesAgreed || !cancellationAgreed ? (
            <>
              <DepositNote>Before paying, please confirm:</DepositNote>
              <CheckboxRow>
                <input
                  type="checkbox"
                  id="rules"
                  checked={rulesAgreed}
                  onChange={(e) => setRulesAgreed(e.target.checked)}
                />
                <label htmlFor="rules">I agree to the entertainer’s rules for this booking.</label>
              </CheckboxRow>
              <CheckboxRow>
                <input
                  type="checkbox"
                  id="cancellation"
                  checked={cancellationAgreed}
                  onChange={(e) => setCancellationAgreed(e.target.checked)}
                />
                <label htmlFor="cancellation">I have read and accept the cancellation policy.</label>
              </CheckboxRow>
            </>
          ) : !clientSecret ? (
            <>
              <DepositNote>Deposit: ${((booking.depositAmount || 0)).toFixed(2)} + Platform fee: $${PLATFORM_FEE_DOLLARS}</DepositNote>
              <DepositButton
                type="button"
                disabled={paymentLoading}
                onClick={async () => {
                  setPaymentLoading(true);
                  setPaymentError(null);
                  try {
                    if (booking.status === BOOKING_STATUS.ACCEPTED) {
                      await initiateDepositPayment(bookingId);
                    }
                    const { clientSecret: secret } = await createDepositPaymentIntent(bookingId);
                    setClientSecret(secret);
                  } catch (e) {
                    setPaymentError(e.message ?? "Could not start payment");
                  } finally {
                    setPaymentLoading(false);
                  }
                }}
              >
                {paymentLoading ? "Preparing…" : "Continue to payment"}
              </DepositButton>
              {paymentError && <DepositError>{paymentError}</DepositError>}
            </>
          ) : (
            <DepositPaymentForm
              clientSecret={clientSecret}
              onSuccess={() => setPaymentSubmitted(true)}
              onError={(msg) => setPaymentError(msg)}
            />
          )}
        </DepositCard>
      )}

      {/* Arrival code: client generates, entertainer enters (only after deposit paid); disabled when frozen */}
      {booking.status === BOOKING_STATUS.DEPOSIT_PAID && !isFrozen && (
        <ArrivalCard>
          <ArrivalTitle>Arrival code</ArrivalTitle>
          {isClient ? (
            <>
              {booking.arrivalCode ? (
                <>
                  <ArrivalCodeDisplay>{booking.arrivalCode}</ArrivalCodeDisplay>
                  <ArrivalHint>Share this 4-digit code with your entertainer when they arrive.</ArrivalHint>
                </>
              ) : (
                <>
                  <ArrivalButton
                    type="button"
                    disabled={codeGenerating}
                    onClick={async () => {
                      setCodeGenerating(true);
                      try {
                        await generateArrivalCode(bookingId);
                      } catch (e) {
                        setPaymentError(e?.message ?? "Could not generate code");
                      } finally {
                        setCodeGenerating(false);
                      }
                    }}
                  >
                    {codeGenerating ? <LoadingSpinner size={20} inline color="#1a1d21" /> : "Generate code"}
                  </ArrivalButton>
                  <ArrivalHint>Generate a code for the entertainer to enter when they arrive.</ArrivalHint>
                </>
              )}
            </>
          ) : (
            <>
              <ArrivalButton type="button" onClick={() => setShowArrivalModal(true)}>
                Confirm arrival
              </ArrivalButton>
              <ArrivalHint>Enter the 4-digit code from the client to start the booking.</ArrivalHint>
            </>
          )}
        </ArrivalCard>
      )}

      {showArrivalModal && (
        <ArrivalCodeEntry
          booking={booking}
          onStarted={() => setShowArrivalModal(false)}
          onClose={() => setShowArrivalModal(false)}
        />
      )}

      {/* Safety button (entertainer only, after deposit paid); hidden when frozen */}
      {!isFrozen && isEntertainer && [BOOKING_STATUS.DEPOSIT_PAID, BOOKING_STATUS.IN_PROGRESS].includes(booking.status) && (
        <ActionSection>
          <SafetyButton
            booking={booking}
            hasEmergencyContact={!!(userData?.emergencyContactPhone || userData?.emergencyContactEmail)}
          />
        </ActionSection>
      )}

      {/* Action Button (messaging still allowed when frozen) */}
      {canMessage && (
        <ActionSection>
          <MessageButton to={`/inbox/${bookingId}`}>
            <MessageCircle size={18} />
            Message {isClient ? "Entertainer" : "Client"}
          </MessageButton>
        </ActionSection>
      )}
    </Container>
  );
}

function getStatusIcon(status) {
  const iconProps = { size: 28 };
  switch (status) {
    case BOOKING_STATUS.REQUESTED: return <Clock3 {...iconProps} />;
    case BOOKING_STATUS.ACCEPTED: return <CheckCircle {...iconProps} />;
    case BOOKING_STATUS.DEPOSIT_PENDING: return <Clock3 {...iconProps} />;
    case BOOKING_STATUS.DEPOSIT_PAID: return <CheckCircle {...iconProps} />;
    case BOOKING_STATUS.DECLINED: return <XCircle {...iconProps} />;
    case BOOKING_STATUS.COMPLETED: return <PartyPopper {...iconProps} />;
    case BOOKING_STATUS.CANCELLED: return <Ban {...iconProps} />;
    default: return <HelpCircle {...iconProps} />;
  }
}

function getStatusLabel(status) {
  switch (status) {
    case BOOKING_STATUS.REQUESTED: return "Pending Response";
    case BOOKING_STATUS.ACCEPTED: return "Booking Confirmed";
    case BOOKING_STATUS.DEPOSIT_PENDING: return "Awaiting deposit";
    case BOOKING_STATUS.DEPOSIT_PAID: return "Deposit paid";
    case BOOKING_STATUS.DECLINED: return "Booking Declined";
    case BOOKING_STATUS.COMPLETED: return "Booking Completed";
    case BOOKING_STATUS.CANCELLED: return "Booking Cancelled";
    default: return "Unknown Status";
  }
}

function getStatusDescription(status, isClient) {
  switch (status) {
    case BOOKING_STATUS.REQUESTED:
      return isClient
        ? "Waiting for the entertainer to respond"
        : "You have a new booking request";
    case BOOKING_STATUS.ACCEPTED:
      return isClient ? "Pay the deposit to confirm" : "Waiting for client to pay deposit";
    case BOOKING_STATUS.DEPOSIT_PENDING:
      return isClient ? "Pay the deposit to confirm" : "Waiting for client to pay deposit";
    case BOOKING_STATUS.DEPOSIT_PAID:
      return "You can now message each other";
    case BOOKING_STATUS.DECLINED:
      return "The entertainer was unavailable";
    case BOOKING_STATUS.COMPLETED:
      return "Thank you for using Knockers!";
    case BOOKING_STATUS.CANCELLED:
      return "This booking was cancelled";
    default: return "";
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "TBD";
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-AU", { 
    weekday: "long",
    year: "numeric",
    month: "long", 
    day: "numeric"
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) return "";
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString("en-AU", { 
    month: "short", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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

const FrozenBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(251, 191, 36, 0.15);
  border-bottom: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text};
  font-size: 0.9rem;
  svg { flex-shrink: 0; color: #eab308; }
`;

const StatusBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 16px;
  background: ${({ $status }) => 
    $status === "requested" ? "rgba(251, 191, 36, 0.1)" :
    $status === "accepted" ? "rgba(34, 197, 94, 0.1)" :
    $status === "completed" ? "rgba(135, 206, 235, 0.1)" :
    "rgba(239, 68, 68, 0.1)"
  };
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const StatusIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.primary};
`;

const StatusText = styled.div``;

const StatusLabel = styled.h2`
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const StatusDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
`;

const InfoCard = styled.div`
  margin: 16px;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
`;

const InfoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const InfoAvatar = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: ${({ theme }) => theme.dark};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
  overflow: hidden;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const InfoDetails = styled.div`
  flex: 1;
`;

const InfoName = styled.h3`
  margin: 0 0 2px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const InfoRole = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const ViewProfileButton = styled(Link)`
  padding: 8px 14px;
  background: ${({ theme }) => theme.bg};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.text};
  font-size: 0.8rem;
  font-weight: 500;
  text-decoration: none;
`;

const DetailsCard = styled.div`
  margin: 0 16px 16px;
  padding: 20px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
`;

const DetailsTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const DetailRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const DetailIconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  color: ${({ theme }) => theme.muted};
`;

const DetailContent = styled.div`
  flex: 1;
`;

const DetailLabel = styled.p`
  margin: 0 0 2px 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.muted};
  text-transform: uppercase;
`;

const DetailValue = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
`;

const TimelineCard = styled.div`
  margin: 0 16px 16px;
  padding: 20px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
`;

const TimelineTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const TimelineItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 8px 0;
  opacity: ${({ $completed }) => $completed ? 1 : 0.5};
`;

const TimelineDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $completed, $declined, theme }) => 
    $declined ? "#ef4444" :
    $completed ? "#22c55e" : 
    theme.dark
  };
  margin-top: 4px;
  flex-shrink: 0;
`;

const TimelineContent = styled.div``;

const TimelineEvent = styled.p`
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.text};
`;

const TimelineDate = styled.p`
  margin: 2px 0 0 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;

const TimelineNote = styled.p`
  margin: 4px 0 0 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  font-style: italic;
`;

const ActionSection = styled.div`
  padding: 16px;
`;

const MessageButton = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
`;

const DepositCard = styled.div`
  margin: 0 16px 16px;
  padding: 20px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
`;

const DepositTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const DepositNote = styled.p`
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
`;

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  label {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.text};
    cursor: pointer;
  }
`;

const DepositButton = styled.button`
  padding: 14px 24px;
  background: ${({ theme }) => theme.primary};
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DepositError = styled.div`
  margin-top: 12px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.error || "#c00"};
`;

const PaymentProcessing = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.muted};
`;

const ArrivalCard = styled.div`
  margin: 0 16px 16px;
  padding: 20px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
`;

const ArrivalTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const ArrivalCodeDisplay = styled.div`
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: ${({ theme }) => theme.primary};
  margin-bottom: 8px;
`;

const ArrivalHint = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const ArrivalButton = styled.button`
  padding: 14px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
