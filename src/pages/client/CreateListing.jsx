// src/pages/client/CreateListing.jsx
// Client posts a job listing; entertainers can apply.
// Validation: ban phone numbers, emails, @handles in title/description (per knockers-fixes).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { createListing } from "../../hooks/useListings";
import useVerificationGate from "../../hooks/useVerificationGate";
import VerificationModal from "../../components/VerificationModal";
import { isIdentityVerified, IDENTITY_VERIFICATION_REQUIRED_MESSAGE } from "../../lib/identityVerification";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import LoadingSpinner from "../../components/LoadingSpinner";
import { logger } from "../../lib/logger";

// Regex: phone (8+ digits or common patterns), email, @handle
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}|\d{8,}/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const HANDLE_REGEX = /@[\w.]+/;

function containsBlockedContent(text) {
  if (!text || !text.trim()) return null;
  const t = text.trim();
  if (PHONE_REGEX.test(t)) return "Please don't include phone numbers in your listing. Use the app to communicate.";
  if (EMAIL_REGEX.test(t)) return "Please don't include email addresses in your listing. Use the app to communicate.";
  if (HANDLE_REGEX.test(t)) return "Please don't include @handles or social usernames in your listing.";
  return null;
}

export default function CreateListing() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { requireVerification, showModal: showVerifModal, dismissModal: dismissVerifModal } = useVerificationGate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    location: "",
    duration: "2",
    budget: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!requireVerification()) return;
    if (!isIdentityVerified(userData, user)) {
      setError(IDENTITY_VERIFICATION_REQUIRED_MESSAGE);
      navigate("/profile/verification");
      return;
    }
    if (!form.title.trim() || !form.location.trim()) {
      setError("Please add a title and location.");
      return;
    }
    const blockedTitle = containsBlockedContent(form.title);
    if (blockedTitle) {
      setError(blockedTitle);
      return;
    }
    const blockedDesc = containsBlockedContent(form.description);
    if (blockedDesc) {
      setError(blockedDesc);
      return;
    }

    setSubmitting(true);
    try {
      const eventDate = form.eventDate ? new Date(form.eventDate) : null;
      const listingId = await createListing({
        clientId: user.uid,
        clientName: userData?.name || user.email,
        clientPhone: userData?.phone || null,
        title: form.title.trim(),
        description: form.description.trim(),
        eventDate,
        eventTime: form.eventTime.trim(),
        location: form.location.trim(),
        duration: parseInt(form.duration, 10) || 2,
        budget: form.budget ? parseFloat(form.budget) : null,
      });
      navigate(`/client/listings/${listingId}`, { replace: true });
    } catch (err) {
      logger.error("Create listing error:", err);
      setError("Could not create listing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Post a listing" showBack />

      <Form onSubmit={handleSubmit}>
        {error && <ErrorMsg>{error}</ErrorMsg>}
        <ListingWarning>
          Don't include phone numbers, emails, or @handles. Use the app to message entertainers after they apply.
        </ListingWarning>

        <Field>
          <Label>Title *</Label>
          <Input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Birthday party entertainer"
            required
          />
        </Field>

        <Field>
          <Label>Description</Label>
          <Textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="What you're looking for..."
            rows={4}
          />
        </Field>

        <Field>
          <Label>Event date</Label>
          <Input
            name="eventDate"
            type="date"
            value={form.eventDate}
            onChange={handleChange}
          />
        </Field>

        <Field>
          <Label>Event time</Label>
          <Input
            name="eventTime"
            value={form.eventTime}
            onChange={handleChange}
            placeholder="e.g. 7:00 PM"
          />
        </Field>

        <Field>
          <Label>Location *</Label>
          <Input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Suburb or venue"
            required
          />
        </Field>

        <Field>
          <Label>Duration (hours)</Label>
          <Select name="duration" value={form.duration} onChange={handleChange}>
            {[1, 2, 3, 4, 5, 6].map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label>Budget (optional)</Label>
          <Input
            name="budget"
            type="number"
            min="0"
            step="50"
            value={form.budget}
            onChange={handleChange}
            placeholder="e.g. 350"
          />
        </Field>

        <Submit type="submit" disabled={submitting}>
          {submitting ? <LoadingSpinner size={22} inline color="#1a1d21" /> : "Post listing"}
        </Submit>
      </Form>
      <VerificationModal show={showVerifModal} onDismiss={dismissVerifModal} />
    </PageContainer>
  );
}

const Form = styled.form`
  padding: 20px 16px;
`;

const ErrorMsg = styled.div`
  padding: 12px;
  background: rgba(239, 68, 68, 0.15);
  border-radius: 12px;
  color: #ef4444;
  font-size: 0.9rem;
  margin-bottom: 16px;
`;

const ListingWarning = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
  margin-bottom: 16px;
  padding: 10px 12px;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 10px;
  line-height: 1.4;
`;

const Field = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 0.9rem;
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

  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  resize: vertical;

  &::placeholder {
    color: ${({ theme }) => theme.muted};
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
`;

const Submit = styled.button`
  width: 100%;
  padding: 16px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
