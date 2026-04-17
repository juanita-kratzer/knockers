// src/components/SafetyButton.jsx
// Emergency safety button for entertainers

import { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { ShieldAlert, X, Phone, MapPin, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { triggerSafetyAlert } from "../hooks/useBookings";
import { logger } from "../lib/logger";

export default function SafetyButton({ booking, onAlertSent, hasEmergencyContact = true }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Get current location when confirm modal opens
  useEffect(() => {
    if (showConfirm && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          setLocationError("Could not get location");
          logger.error("Location error:", error);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [showConfirm]);

  const handleTrigger = async () => {
    setSending(true);

    try {
      const result = await triggerSafetyAlert(booking.id, location);

      if (result.success) {
        setSent(true);
        onAlertSent?.();
      }
    } catch (err) {
      logger.error("Safety alert error:", err);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <SentContainer>
        <SentIcon>
          <CheckCircle size={32} />
        </SentIcon>
        <SentTitle>Alert Sent</SentTitle>
        <SentText>
          Your emergency contact has been notified with your location and booking details.
        </SentText>
        <SentButton onClick={() => setSent(false)}>Dismiss</SentButton>
      </SentContainer>
    );
  }

  const handleTriggerClick = () => {
    if (!hasEmergencyContact) {
      setShowBlockedModal(true);
      return;
    }
    setShowConfirm(true);
  };

  return (
    <>
      <TriggerButton onClick={handleTriggerClick}>
        <ShieldAlert size={24} />
        <span>Safety Alert</span>
      </TriggerButton>

      {showBlockedModal && (
        <Overlay onClick={() => setShowBlockedModal(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <AlertIcon>
                <ShieldAlert size={32} />
              </AlertIcon>
              <CloseButton onClick={() => setShowBlockedModal(false)}>
                <X size={24} />
              </CloseButton>
            </ModalHeader>
            <ModalContent>
              <ModalTitle>Add emergency contact</ModalTitle>
              <ModalText>
                Set up a safety alert recipient in Settings to enable the Safety Button. When you use it, they'll receive your location and booking details.
              </ModalText>
            </ModalContent>
            <ModalFooter>
              <CancelButton onClick={() => setShowBlockedModal(false)}>Cancel</CancelButton>
              <ConfirmButton as={Link} to="/settings/emergency-contact" $primary>
                Add emergency contact
              </ConfirmButton>
            </ModalFooter>
          </Modal>
        </Overlay>
      )}

      {showConfirm && (
        <Overlay onClick={() => setShowConfirm(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <AlertIcon>
                <ShieldAlert size={32} />
              </AlertIcon>
              <CloseButton onClick={() => setShowConfirm(false)}>
                <X size={24} />
              </CloseButton>
            </ModalHeader>

            <ModalContent>
              <ModalTitle>Send Safety Alert?</ModalTitle>
              <ModalText>
                This will immediately send a message to your emergency contact with:
              </ModalText>

              <AlertDetails>
                <AlertItem>
                  <MapPin size={18} />
                  <span>Your current location</span>
                </AlertItem>
                <AlertItem>
                  <Phone size={18} />
                  <span>Client's name: {booking.clientName}</span>
                </AlertItem>
                <AlertItem>
                  <MapPin size={18} />
                  <span>Booking location: {booking.location}</span>
                </AlertItem>
              </AlertDetails>

              {locationError && (
                <LocationWarning>
                  Location unavailable - alert will still be sent with booking details
                </LocationWarning>
              )}

              <WarningText>
                Only use this in genuine emergency situations.
              </WarningText>
            </ModalContent>

            <ModalFooter>
              <CancelButton onClick={() => setShowConfirm(false)}>Cancel</CancelButton>
              <ConfirmButton onClick={handleTrigger} disabled={sending}>
                {sending ? "Sending..." : "Send Alert Now"}
              </ConfirmButton>
            </ModalFooter>
          </Modal>
        </Overlay>
      )}
    </>
  );
}

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
`;

const TriggerButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: #dc2626;
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  animation: ${pulse} 2s infinite;

  &:hover {
    background: #b91c1c;
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.card};
  width: 100%;
  max-width: 400px;
  border-radius: 24px;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 20px 0;
`;

const AlertIcon = styled.div`
  width: 64px;
  height: 64px;
  background: rgba(239, 68, 68, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.muted};
  cursor: pointer;
  padding: 4px;
`;

const ModalContent = styled.div`
  padding: 20px;
`;

const ModalTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const ModalText = styled.p`
  margin: 0 0 16px;
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
  line-height: 1.5;
`;

const AlertDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 12px;
  margin-bottom: 16px;
`;

const AlertItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 0.9rem;

  svg {
    color: ${({ theme }) => theme.muted};
    flex-shrink: 0;
  }
`;

const LocationWarning = styled.div`
  padding: 12px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
  color: #f59e0b;
  font-size: 0.85rem;
  margin-bottom: 16px;
`;

const WarningText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.muted};
  font-size: 0.85rem;
  font-style: italic;
`;

const ModalFooter = styled.div`
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid ${({ theme }) => theme.border};
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 16px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
`;

const ConfirmButton = styled.button`
  flex: 1;
  padding: 16px;
  background: ${({ $primary }) => ($primary ? "var(--primary, #87CEEB)" : "#dc2626")};
  border: none;
  border-radius: 12px;
  color: ${({ $primary }) => ($primary ? "#1a1d21" : "white")};
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SentContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  background: ${({ theme }) => theme.card};
  border-radius: 16px;
  text-align: center;
`;

const SentIcon = styled.div`
  color: #22c55e;
  margin-bottom: 12px;
`;

const SentTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const SentText = styled.p`
  margin: 0 0 16px;
  color: ${({ theme }) => theme.muted};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const SentButton = styled.button`
  padding: 12px 24px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  color: ${({ theme }) => theme.text};
  font-weight: 600;
  cursor: pointer;
`;


