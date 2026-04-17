// src/pages/talent/AcceptBooking.jsx
// Entertainer sets deposit and total when accepting a booking

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { canUsePaidFeatures } from "../../lib/verificationFee";
import { isIdentityVerified, IDENTITY_VERIFICATION_REQUIRED_MESSAGE } from "../../lib/identityVerification";
import { isAppleReviewAccount } from "../../lib/appleReview";
import { useBooking, acceptBookingWithDeposit, BOOKING_STATUS, PLATFORM_FEE } from "../../hooks/useBookings";
import { COL } from "../../lib/collections";
import { PLATFORM_FEE_DOLLARS } from "../../lib/policies";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import { logger } from "../../lib/logger";

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export default function AcceptBooking() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { booking, loading, error } = useBooking(bookingId);
  const [depositAmount, setDepositAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [breakdown, setBreakdown] = useState([{ name: "", amount: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [entertainerDoc, setEntertainerDoc] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      const { db } = await import("../../firebase");
      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, COL.entertainers, user.uid));
      setEntertainerDoc(snap.exists() ? snap.data() : null);
    })();
  }, [user?.uid]);

  const isEntertainer = booking?.entertainerId === user?.uid;
  const clientTotal = totalAmount !== "" ? roundMoney(Number(totalAmount) + PLATFORM_FEE) : null;

  const handleAddBreakdown = () => {
    setBreakdown((prev) => [...prev, { name: "", amount: "" }]);
  };

  const handleBreakdownChange = (index, field, value) => {
    setBreakdown((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const deposit = roundMoney(Number(depositAmount));
    const total = roundMoney(Number(totalAmount));

    if (deposit <= 0) {
      setFormError("Deposit must be greater than 0.");
      return;
    }
    if (total <= 0) {
      setFormError("Total (your fee) must be greater than 0.");
      return;
    }
    if (deposit > total + PLATFORM_FEE) {
      setFormError(`Deposit cannot exceed the total amount the client pays (your fee + $${PLATFORM_FEE_DOLLARS} platform fee).`);
      return;
    }

    const serviceBreakdown = breakdown
      .filter((row) => row.name.trim() && row.amount !== "" && Number(row.amount) > 0)
      .map((row) => ({ name: row.name.trim(), amount: roundMoney(Number(row.amount)) }));

    setSubmitting(true);
    try {
      await acceptBookingWithDeposit(bookingId, {
        depositAmount: deposit,
        totalAmount: total,
        serviceBreakdown,
        entertainerRules: "",
        travelFee: 0,
        asapFee: 0,
      });
      navigate(`/booking/${bookingId}`, { replace: true });
    } catch (err) {
      logger.error("Accept booking error:", err);
      setFormError(err?.message ?? "Could not accept booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Accept booking" showBack />
        <LoadingWrap>
          <LoadingSpinner size={32} />
        </LoadingWrap>
      </PageContainer>
    );
  }

  if (error || !booking) {
    return (
      <PageContainer>
        <PageHeader title="Accept booking" showBack />
        <ErrorMessage
          title="Booking not found"
          error="This booking doesn't exist or you don't have access to it."
        />
      </PageContainer>
    );
  }

  if (booking.status !== BOOKING_STATUS.REQUESTED) {
    return (
      <PageContainer>
        <PageHeader title="Accept booking" showBack />
        <ErrorMessage
          title="Already responded"
          error="This request has already been accepted or declined."
        />
        <BackLink to={`/booking/${bookingId}`}>View booking</BackLink>
      </PageContainer>
    );
  }

  if (booking.isFrozen) {
    return (
      <PageContainer>
        <PageHeader title="Accept booking" showBack />
        <ErrorMessage
          title="Booking under review"
          error="This booking is under admin review. You cannot accept or decline until it is resolved."
        />
        <BackLink to={`/booking/${bookingId}`}>View booking</BackLink>
      </PageContainer>
    );
  }

  if (!canUsePaidFeatures(userData, user)) {
    return (
      <PageContainer>
        <PageHeader title="Accept booking" showBack />
        <ErrorMessage
          title="Verification required"
          error="Pay the $2 verification fee to accept bookings. Go to Profile → Verification & Badges."
        />
        <BackLink to="/profile/verification">Verification</BackLink>
      </PageContainer>
    );
  }

  if (!isIdentityVerified(userData, user)) {
    return (
      <PageContainer>
        <PageHeader title="Accept booking" showBack />
        <ErrorMessage
          title="Identity verification required"
          error={IDENTITY_VERIFICATION_REQUIRED_MESSAGE}
        />
        <BackLink to="/profile/verification">Verify Identity</BackLink>
      </PageContainer>
    );
  }

  if (!isEntertainer) {
    return (
      <PageContainer>
        <PageHeader title="Accept booking" showBack />
        <ErrorMessage title="Access denied" error="Only the entertainer can accept this booking." />
      </PageContainer>
    );
  }

  const suspended = userData?.isSuspended === true;
  const banned = userData?.isBanned === true;
  const balanceCents = entertainerDoc?.balanceCents ?? 0;
  const outstandingBalance = balanceCents < 0;

  // Apple review account: allow access to accept flow (never block for review)
  if ((banned || suspended) && !isAppleReviewAccount(user)) {
    return (
      <PageContainer>
        <PageHeader title="Accept booking" showBack />
        <ErrorMessage
          title={banned ? "Account banned" : "Account suspended"}
          error="You cannot accept new bookings. Contact support if you believe this is an error."
        />
      </PageContainer>
    );
  }

  if (outstandingBalance) {
    return (
      <PageContainer>
        <PageHeader title="Accept booking" showBack />
        <ErrorMessage
          title="Outstanding balance"
          error={`You have an outstanding balance of $${(Math.abs(balanceCents) / 100).toFixed(2)}. Please resolve this before accepting new bookings.`}
        />
      </PageContainer>
    );
  }

  const payoutsEnabled = entertainerDoc?.stripe?.payoutsEnabled === true;
  if (entertainerDoc && !payoutsEnabled) {
    return (
      <PageContainer>
        <PageHeader title="Accept booking" showBack />
        <ErrorMessage
          title="Connect Stripe to receive payments"
          error="You need to connect your Stripe account before you can accept bookings. Set up payouts on the Finances page."
        />
        <StripeCtaWrap>
          <StripeCta to="/finances">Set up payouts</StripeCta>
        </StripeCtaWrap>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Accept booking" showBack />

      <Form onSubmit={handleSubmit}>
        <Intro>
          Set the deposit (amount the client pays upfront) and your total fee. Client will also pay a ${PLATFORM_FEE_DOLLARS} platform fee.
        </Intro>

        {formError && <ErrorMsg>{formError}</ErrorMsg>}

        <Field>
          <Label>Deposit amount ($) *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 100"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            required
          />
          <Hint>Amount the client must pay within 10 minutes to confirm.</Hint>
        </Field>

        <Field>
          <Label>Your fee total ($) *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 200"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
          />
          {clientTotal != null && (
            <Hint>Client pays ${clientTotal.toFixed(2)} total (your fee + ${PLATFORM_FEE_DOLLARS} platform fee).</Hint>
          )}
        </Field>

        <SectionTitle>Breakdown (optional)</SectionTitle>
        {breakdown.map((row, index) => (
          <BreakdownRow key={index}>
            <Input
              placeholder="e.g. Performance"
              value={row.name}
              onChange={(e) => handleBreakdownChange(index, "name", e.target.value)}
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={row.amount}
              onChange={(e) => handleBreakdownChange(index, "amount", e.target.value)}
            />
          </BreakdownRow>
        ))}
        <AddRow type="button" onClick={handleAddBreakdown}>
          + Add line
        </AddRow>

        <SubmitButton type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <LoadingSpinner size={20} inline color="#1a1d21" />
              Accepting…
            </>
          ) : (
            "Accept booking"
          )}
        </SubmitButton>
      </Form>
    </PageContainer>
  );
}

const LoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

const BackLink = styled(Link)`
  display: inline-block;
  margin: 16px;
  color: ${({ theme }) => theme.primary};
  font-weight: 600;
`;

const StripeCtaWrap = styled.div`
  text-align: center;
  padding: 0 24px 24px;
`;
const StripeCta = styled(Link)`
  display: inline-block;
  padding: 12px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  &:hover,
  &:focus {
    opacity: 0.95;
  }
`;

const Form = styled.form`
  padding: 16px;
  max-width: 480px;
`;

const Intro = styled.p`
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
  margin: 0 0 20px 0;
  line-height: 1.5;
`;

const ErrorMsg = styled.p`
  color: ${({ theme }) => theme.error || "#c00"};
  font-size: 0.9rem;
  margin: 0 0 16px 0;
`;

const Field = styled.div`
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

const Hint = styled.p`
  margin: 8px 0 0 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;

const SectionTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin: 24px 0 12px 0;
`;

const BreakdownRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 100px;
  gap: 10px;
  margin-bottom: 10px;
`;

const AddRow = styled.button`
  padding: 10px 0;
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 24px;
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
  gap: 10px;
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
