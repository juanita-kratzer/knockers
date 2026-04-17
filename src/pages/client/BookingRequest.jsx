// src/pages/client/BookingRequest.jsx
// Form to request a booking with an entertainer

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import { useRole } from "../../context/RoleContext";
import { useEntertainer } from "../../hooks/useEntertainers";
import { createBooking } from "../../hooks/useBookings";
import { sanitizeOrReject } from "../../lib/contentModeration";
import useVerificationGate from "../../hooks/useVerificationGate";
import VerificationModal from "../../components/VerificationModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import { logger } from "../../lib/logger";

export default function BookingRequest() {
  const { id: entertainerId } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { ageVerified, verifyAge } = useRole();
  const { entertainer, loading, error } = useEntertainer(entertainerId);
  const { requireVerification, showModal: showVerifModal, dismissModal: dismissVerifModal } = useVerificationGate();

  const [formData, setFormData] = useState({
    eventDate: "",
    eventTime: "",
    location: "",
    duration: "2",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!requireVerification()) return;

    // Check age verification for adult content
    if (entertainer?.isAdultContent && !ageVerified) {
      setShowAgeGate(true);
      return;
    }

    if (!user) {
      navigate("/client/login", { state: { from: `/book/${entertainerId}` } });
      return;
    }

    if (!formData.eventDate || !formData.location) {
      alert("Please fill in all required fields");
      return;
    }

    const notesCheck = sanitizeOrReject(formData.notes || "");
    if (!notesCheck.ok) {
      alert(notesCheck.reason || "Personal contact details can't be shared until after deposit is paid.");
      return;
    }

    setSubmitting(true);
    try {
      const bookingData = {
        entertainerId,
        entertainerName: entertainer?.displayName || "Entertainer",
        clientId: user.uid,
        clientName: userData?.name || user.email,
        clientEmail: user.email,
        clientPhone: userData?.phone || user.phoneNumber || null,
        eventDate: new Date(formData.eventDate),
        eventTime: formData.eventTime,
        location: formData.location,
        duration: parseInt(formData.duration) || 2,
        notes: formData.notes,
        estimatedCost: entertainer?.pricing?.baseRate 
          ? entertainer.pricing.baseRate * (parseInt(formData.duration) || 2)
          : null,
      };

      const bookingId = await createBooking(bookingData);

      navigate(`/booking/${bookingId}`);
    } catch (err) {
      logger.error("Failed to create booking:", err);
      alert("Failed to submit booking request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAgeVerify = async () => {
    await verifyAge();
    setShowAgeGate(false);
    // Re-trigger submit after verification
    handleSubmit({ preventDefault: () => {} });
  };

  if (loading) {
    return (
      <Container>
        <LoadingWrapper>
          <LoadingSpinner size={32} />
        </LoadingWrapper>
      </Container>
    );
  }

  if (error || !entertainer) {
    return (
      <Container>
        <ErrorMessage 
          title="Entertainer not found"
          error="This entertainer profile doesn't exist or has been removed."
        />
      </Container>
    );
  }

  // Age gate modal
  if (showAgeGate) {
    return (
      <AgeGateOverlay>
        <AgeGateCard>
          <AgeGateIcon>18+</AgeGateIcon>
          <AgeGateTitle>Age Verification Required</AgeGateTitle>
          <AgeGateText>
            This entertainer offers adult content. By continuing, you confirm that you are at least 18 years old.
          </AgeGateText>
          <AgeGateButtons>
            <AgeVerifyButton onClick={handleAgeVerify}>
              I am 18 or older
            </AgeVerifyButton>
            <AgeCancelButton onClick={() => setShowAgeGate(false)}>
              Cancel
            </AgeCancelButton>
          </AgeGateButtons>
        </AgeGateCard>
      </AgeGateOverlay>
    );
  }

  return (
    <Container>
      <PageHeader
        title="Request Booking"
        onBack={() => navigate(`/talent/${entertainerId}`)}
      />

      {/* Entertainer Summary */}
      <EntertainerCard>
        <EntertainerImage>
          {entertainer.photos?.[0] ? (
            <img src={entertainer.photos[0]} alt={entertainer.displayName} />
          ) : (
            <Placeholder>{entertainer.displayName?.[0] || "?"}</Placeholder>
          )}
        </EntertainerImage>
        <EntertainerInfo>
          <EntertainerName>{entertainer.displayName}</EntertainerName>
          <EntertainerCategory>
            {entertainer.subCategories?.[0] || entertainer.categories?.[0] || "Entertainer"}
          </EntertainerCategory>
          {entertainer.pricing?.baseRate > 0 && (
            <EntertainerRate>
              ${entertainer.pricing.baseRate}/hr
            </EntertainerRate>
          )}
        </EntertainerInfo>
      </EntertainerCard>

      {/* Booking Form */}
      <Form onSubmit={handleSubmit}>
        <FormSection>
          <Label>Event Date *</Label>
          <Input
            type="date"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
            min={new Date().toISOString().split("T")[0]}
            required
          />
        </FormSection>

        <FormSection>
          <Label>Start Time</Label>
          <Input
            type="time"
            name="eventTime"
            value={formData.eventTime}
            onChange={handleChange}
          />
        </FormSection>

        <FormSection>
          <Label>Duration (hours)</Label>
          <Select
            name="duration"
            value={formData.duration}
            onChange={handleChange}
          >
            <option value="1">1 hour</option>
            <option value="2">2 hours</option>
            <option value="3">3 hours</option>
            <option value="4">4 hours</option>
            <option value="5">5+ hours</option>
          </Select>
        </FormSection>

        <FormSection>
          <Label>Event Location *</Label>
          <Input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Address or venue name"
            required
          />
        </FormSection>

        <FormSection>
          <Label>Additional Notes</Label>
          <TextArea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Event type, special requests, etc."
            rows={4}
          />
        </FormSection>

        {/* Cost Estimate */}
        {entertainer.pricing?.baseRate > 0 && (
          <EstimateCard>
            <EstimateLabel>Estimated Cost</EstimateLabel>
            <EstimateAmount>
              ${entertainer.pricing.baseRate * parseInt(formData.duration || 2)}
            </EstimateAmount>
            <EstimateNote>
              Final price confirmed by entertainer
            </EstimateNote>
          </EstimateCard>
        )}

        <SubmitButton type="submit" disabled={submitting}>
          {submitting ? (
            <LoadingSpinner size={20} inline color="#1a1d21" />
          ) : (
            "Send Booking Request"
          )}
        </SubmitButton>

        <Disclaimer>
          By submitting, you agree to Knockers' terms of service. 
          Payment is only processed after the entertainer accepts your booking.
        </Disclaimer>
      </Form>
      <VerificationModal show={showVerifModal} onDismiss={dismissVerifModal} />
    </Container>
  );
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


const EntertainerCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  margin: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
`;

const EntertainerImage = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.dark};
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
`;

const EntertainerInfo = styled.div`
  flex: 1;
`;

const EntertainerName = styled.h2`
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const EntertainerCategory = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const EntertainerRate = styled.p`
  margin: 4px 0 0 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.primary};
`;

const Form = styled.form`
  padding: 0 16px;
`;

const FormSection = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
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

const Select = styled.select`
  width: 100%;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  outline: none;
  
  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  outline: none;
  resize: vertical;
  font-family: inherit;
  
  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
  
  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const EstimateCard = styled.div`
  background: ${({ theme }) => theme.hover};
  border: 1px solid ${({ theme }) => theme.primary}44;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  margin-bottom: 24px;
`;

const EstimateLabel = styled.p`
  margin: 0 0 4px 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const EstimateAmount = styled.p`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
`;

const EstimateNote = styled.p`
  margin: 8px 0 0 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.muted};
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 16px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const Disclaimer = styled.p`
  margin: 16px 0 0 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.muted};
  text-align: center;
  line-height: 1.5;
`;

// Age Gate Styles
const AgeGateOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
`;

const AgeGateCard = styled.div`
  background: ${({ theme }) => theme.card};
  border-radius: 20px;
  padding: 32px 24px;
  max-width: 360px;
  width: 100%;
  text-align: center;
`;

const AgeGateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const AgeGateTitle = styled.h2`
  margin: 0 0 12px 0;
  font-size: 1.3rem;
  color: ${({ theme }) => theme.text};
`;

const AgeGateText = styled.p`
  margin: 0 0 24px 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.muted};
  line-height: 1.5;
`;

const AgeGateButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AgeVerifyButton = styled.button`
  padding: 14px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
`;

const AgeCancelButton = styled.button`
  padding: 14px 24px;
  background: transparent;
  color: ${({ theme }) => theme.muted};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  font-size: 1rem;
  cursor: pointer;
`;
