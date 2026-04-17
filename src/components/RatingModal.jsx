// src/components/RatingModal.jsx
// 5-star rating and review submission

import { useState } from "react";
import styled from "styled-components";
import { X, Star, AlertCircle } from "lucide-react";
import { submitRating, ANONYMOUS_PERIOD_DAYS } from "../hooks/useRatings";
import { logger } from "../lib/logger";

export default function RatingModal({ booking, userType, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const revieweeName =
    userType === "client" ? booking.entertainerName : booking.clientName;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitRating({
        bookingId: booking.id,
        reviewerId: userType === "client" ? booking.clientId : booking.entertainerId,
        reviewerType: userType,
        revieweeId: userType === "client" ? booking.entertainerId : booking.clientId,
        revieweeType: userType === "client" ? "entertainer" : "client",
        rating,
        review,
      });

      onSubmitted?.();
      onClose();
    } catch (err) {
      logger.error("Rating submission error:", err);
      setError("Failed to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderTitle>Rate Your Experience</HeaderTitle>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </Header>

        <Content>
          <RevieweeInfo>
            <span>How was your experience with</span>
            <RevieweeName>{revieweeName}?</RevieweeName>
          </RevieweeInfo>

          <StarsContainer>
            {[1, 2, 3, 4, 5].map((star) => (
              <StarButton
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  size={40}
                  fill={(hoverRating || rating) >= star ? "#87CEEB" : "transparent"}
                  color={(hoverRating || rating) >= star ? "#87CEEB" : "#4a4f58"}
                />
              </StarButton>
            ))}
          </StarsContainer>

          <RatingText>
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </RatingText>

          <FormGroup>
            <Label>Write a review (optional)</Label>
            <Textarea
              placeholder={
                userType === "client"
                  ? "Share your experience with this entertainer..."
                  : "Share your experience with this client..."
              }
              value={review}
              onChange={(e) => setReview(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <CharCount>{review.length}/500</CharCount>
          </FormGroup>

          <InfoBox>
            <AlertCircle size={16} />
            <span>
              Reviews are anonymous for {ANONYMOUS_PERIOD_DAYS} days.
              {userType === "entertainer" &&
                " Client reviews are only visible to other entertainers."}
            </span>
          </InfoBox>

          {error && <ErrorText>{error}</ErrorText>}
        </Content>

        <Footer>
          <SkipButton type="button" onClick={onClose}>
            Skip for Now
          </SkipButton>
          <SubmitButton type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Rating"}
          </SubmitButton>
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
  max-width: 420px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
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

  &:hover {
    color: ${({ theme }) => theme.text};
  }
`;

const Content = styled.div`
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const RevieweeInfo = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
`;

const RevieweeName = styled.div`
  color: ${({ theme }) => theme.text};
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 4px;
`;

const StarsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
`;

const StarButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.15);
  }
`;

const RatingText = styled.div`
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.primary};
  min-height: 28px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const Textarea = styled.textarea`
  padding: 14px 16px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};
  outline: none;
  resize: none;
  font-family: inherit;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
`;

const CharCount = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  text-align: right;
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
  }
`;

const ErrorText = styled.div`
  color: #ef4444;
  font-size: 0.9rem;
  text-align: center;
`;

const Footer = styled.div`
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid ${({ theme }) => theme.border};
`;

const SkipButton = styled.button`
  flex: 1;
  padding: 16px;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.muted};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.bgAlt};
  }
`;

const SubmitButton = styled.button`
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


