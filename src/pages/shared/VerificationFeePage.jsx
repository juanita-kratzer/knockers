// Phase 6: Verification fee — $1.99 Apple IAP via RevenueCat (or admin waiver)

import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { canUsePaidFeatures } from "../../lib/verificationFee";
import { VERIFICATION_FEE_DOLLARS } from "../../lib/policies";
import useRevenueCat from "../../hooks/useRevenueCat";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import LoadingSpinner from "../../components/LoadingSpinner";
import { ShieldCheck, Smartphone, Mail, RotateCcw, Headphones } from "lucide-react";

export default function VerificationFeePage() {
  const { user, userData } = useAuth();
  const paidOrWaived = canUsePaidFeatures(userData, user);
  const {
    native,
    purchasing,
    restoring,
    error,
    purchase,
    restore,
    showCustomerCenter,
    clearError,
  } = useRevenueCat();

  const handlePurchase = async () => {
    clearError();
    await purchase();
  };

  const handleRestore = async () => {
    clearError();
    await restore();
  };

  return (
    <PageContainer>
      <PageHeader title="Verification" showBack />

      <Content>
        <FeeCard>
          <IconWrap>
            <ShieldCheck size={32} />
          </IconWrap>
          <Title>Verification fee: ${VERIFICATION_FEE_DOLLARS}</Title>
          <Description>
            Pay a one-time verification fee to unlock messaging, bookings, and listings.
          </Description>

          {paidOrWaived ? (
            <>
              <StatusBadge>
                You're verified. You can message, book, and post.
              </StatusBadge>
              {native && (
                <CustomerCenterBtn onClick={showCustomerCenter}>
                  <Headphones size={16} />
                  Manage Purchase
                </CustomerCenterBtn>
              )}
            </>
          ) : (
            <>
              {error && <ErrorMsg>{error}</ErrorMsg>}

              {native ? (
                <ButtonGroup>
                  <PurchaseBtn onClick={handlePurchase} disabled={purchasing || restoring}>
                    {purchasing ? (
                      <><LoadingSpinner size={18} inline color="#1a1d21" /> Processing...</>
                    ) : (
                      `Pay $${VERIFICATION_FEE_DOLLARS} Verification Fee`
                    )}
                  </PurchaseBtn>
                  <RestoreBtn onClick={handleRestore} disabled={purchasing || restoring}>
                    {restoring ? (
                      <><LoadingSpinner size={18} inline /> Restoring...</>
                    ) : (
                      <><RotateCcw size={16} /> Restore Previous Purchase</>
                    )}
                  </RestoreBtn>
                </ButtonGroup>
              ) : (
                <Steps>
                  <Step>
                    <Smartphone size={20} />
                    <span>Open the <strong>iOS app</strong> to complete the in-app purchase.</span>
                  </Step>
                  <Step>
                    <Mail size={20} />
                    <span>On <strong>web</strong>: contact support or ask an admin to waive the fee.</span>
                  </Step>
                </Steps>
              )}

              <Disclaimer>
                Platform fee for bookings is $30 (Stripe), shown at checkout. No subscriptions or premium tiers.
              </Disclaimer>
            </>
          )}
        </FeeCard>
      </Content>
    </PageContainer>
  );
}

const Content = styled.div`
  padding: 16px;
`;

const FeeCard = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  padding: 24px;
`;

const IconWrap = styled.div`
  color: ${({ theme }) => theme.primary};
  margin-bottom: 12px;
`;

const Title = styled.h2`
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const Description = styled.p`
  margin: 0 0 20px;
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
`;

const StatusBadge = styled.div`
  padding: 12px 16px;
  border-radius: 50px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.15);
  text-align: center;
`;

const ErrorMsg = styled.div`
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  margin-bottom: 16px;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PurchaseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const RestoreBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: transparent;
  color: ${({ theme }) => theme.primary};
  border: 1px solid ${({ theme }) => theme.primary};
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const CustomerCenterBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: transparent;
  color: ${({ theme }) => theme.muted};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
`;

const Steps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
`;

const Step = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};
  svg { flex-shrink: 0; color: ${({ theme }) => theme.muted}; }
`;

const Disclaimer = styled.p`
  margin: 16px 0 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;
