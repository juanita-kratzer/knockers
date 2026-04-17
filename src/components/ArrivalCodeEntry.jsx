// src/components/ArrivalCodeEntry.jsx
// Code entry for entertainers to confirm arrival and start booking

import { useState } from "react";
import styled from "styled-components";
import { X, MapPin, Clock, CheckCircle } from "lucide-react";
import { startBooking } from "../hooks/useBookings";
import { logger } from "../lib/logger";

export default function ArrivalCodeEntry({ booking, onStarted, onClose }) {
  const [code, setCode] = useState(["", "", "", ""]);
  const [shareLocation, setShareLocation] = useState(true);
  const [expectedFinish, setExpectedFinish] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState(null);

  // Handle code input
  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async () => {
    const fullCode = code.join("");

    if (fullCode.length !== 4) {
      setError("Please enter the 4-digit code");
      return;
    }

    setSubmitting(true);
    setError(null);

    // Get location if sharing
    if (shareLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(loc);
          await submitCode(fullCode, loc);
        },
        async () => {
          // Continue without location
          await submitCode(fullCode, null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      await submitCode(fullCode, null);
    }
  };

  const submitCode = async (fullCode, loc) => {
    try {
      const result = await startBooking(booking.id, fullCode, {
        shareLocation,
        location: loc,
        expectedFinishTime: expectedFinish || null,
      });

      if (result.success) {
        onStarted?.();
        onClose();
      } else {
        setError(result.error || "Invalid code");
      }
    } catch (err) {
      logger.error("Start booking error:", err);
      setError("Failed to start booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderTitle>Enter Arrival Code</HeaderTitle>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </Header>

        <Content>
          <Instructions>
            Ask the client for their 4-digit code to confirm your arrival and start the
            booking.
          </Instructions>

          <CodeInputContainer>
            {code.map((digit, index) => (
              <CodeInput
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                $error={error}
              />
            ))}
          </CodeInputContainer>

          {error && <ErrorText>{error}</ErrorText>}

          <OptionsSection>
            <OptionRow>
              <OptionLabel>
                <MapPin size={18} />
                Share my location until booking ends
              </OptionLabel>
              <Toggle
                type="checkbox"
                checked={shareLocation}
                onChange={(e) => setShareLocation(e.target.checked)}
              />
            </OptionRow>

            <FormGroup>
              <OptionLabel>
                <Clock size={18} />
                Expected finish time (optional)
              </OptionLabel>
              <TimeInput
                type="time"
                value={expectedFinish}
                onChange={(e) => setExpectedFinish(e.target.value)}
              />
            </FormGroup>
          </OptionsSection>

          <InfoBox>
            <CheckCircle size={16} />
            <span>
              Once confirmed, the booking timer starts and you can use the safety features
              throughout.
            </span>
          </InfoBox>
        </Content>

        <Footer>
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <ConfirmButton onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Starting..." : "Start Booking"}
          </ConfirmButton>
        </Footer>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.card};
  width: 100%;
  max-width: 400px;
  border-radius: 24px;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.muted};
  cursor: pointer;
  padding: 4px;
`;

const Content = styled.div`
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Instructions = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
  text-align: center;
  line-height: 1.5;
`;

const CodeInputContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
`;

const CodeInput = styled.input`
  width: 60px;
  height: 70px;
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  background: ${({ theme }) => theme.bgAlt};
  border: 2px solid ${({ $error, theme }) => ($error ? "#ef4444" : theme.border)};
  border-radius: 16px;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const ErrorText = styled.div`
  color: #ef4444;
  font-size: 0.9rem;
  text-align: center;
`;

const OptionsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const OptionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const OptionLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};

  svg {
    color: ${({ theme }) => theme.muted};
  }
`;

const Toggle = styled.input`
  width: 44px;
  height: 24px;
  appearance: none;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease;

  &:checked {
    background: ${({ theme }) => theme.primary};
  }

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s ease;
  }

  &:checked::after {
    transform: translateX(20px);
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TimeInput = styled.input`
  padding: 12px 16px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const InfoBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 12px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
  line-height: 1.4;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: ${({ theme }) => theme.primary};
  }
`;

const Footer = styled.div`
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
  background: ${({ theme }) => theme.primary};
  border: none;
  border-radius: 12px;
  color: #1a1d21;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;


