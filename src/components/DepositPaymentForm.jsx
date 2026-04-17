/**
 * Phase 1: Stripe Payment Element for deposit + platform fee.
 * Uses clientSecret from createDepositPaymentIntent (not stored).
 */

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import styled from "styled-components";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function PaymentFormInner({ clientSecret, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: undefined,
              address: undefined,
            },
          },
        },
        redirect: "if_required",
      });
      if (error) {
        setErrorMessage(error.message ?? "Payment failed");
        setLoading(false);
        return;
      }
      onSuccess?.();
    } catch (err) {
      setErrorMessage(err.message ?? "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <PaymentElement />
      {errorMessage && <ErrorText>{errorMessage}</ErrorText>}
      <SubmitButton type="submit" disabled={!stripe || loading}>
        {loading ? "Processing…" : "Pay deposit"}
      </SubmitButton>
    </Form>
  );
}

function DepositPaymentForm({ clientSecret, onSuccess, onError }) {
  if (!stripePromise) {
    return (
      <FormWrap>
        <p>Stripe is not configured (missing VITE_STRIPE_PUBLISHABLE_KEY).</p>
      </FormWrap>
    );
  }
  if (!clientSecret) {
    return null;
  }
  const options = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: { borderRadius: "12px" },
    },
  };
  return (
    <FormWrap>
      <Elements stripe={stripePromise} options={options}>
        <PaymentFormInner
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </FormWrap>
  );
}

const FormWrap = styled.div`
  padding: 16px 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ErrorText = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.error || "#c00"};
`;

const SubmitButton = styled.button`
  padding: 14px 24px;
  background: ${({ theme }) => theme.primary};
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default DepositPaymentForm;
