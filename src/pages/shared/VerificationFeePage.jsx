// Phase 6: Verification fee — $2 Apple IAP (or admin waiver)

import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { canUsePaidFeatures } from "../../lib/verificationFee";
import { VERIFICATION_FEE_DOLLARS } from "../../lib/policies";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import { ShieldCheck, Smartphone, Mail } from "lucide-react";

export default function VerificationFeePage() {
  const { user, userData } = useAuth();
  const paidOrWaived = canUsePaidFeatures(userData, user);

  return (
    <PageContainer>
      <PageHeader title="Verification" showBack />

      <Content>
        <FeeCard>
          <IconWrap>
            <ShieldCheck size={32} />
          </IconWrap>
          <Title>Verification fee: ${VERIFICATION_FEE_DOLLARS} (Apple)</Title>
          <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "0.95rem" }}>
            To unlock messaging, bookings, and listings, pay the one-time verification fee via Apple In-App Purchase.
          </p>

          {paidOrWaived ? (
            <StatusBadge $paid>
              You’re verified. You can message, book, and post.
            </StatusBadge>
          ) : (
            <>
              <Steps>
                <Step>
                  <Smartphone size={20} />
                  <span>On the <strong>iOS app</strong>: complete the in-app purchase when prompted. Your receipt is verified automatically.
                </span>
                </Step>
                <Step>
                  <Mail size={20} />
                  <span>On <strong>web</strong>: contact support or ask an admin to waive the fee. Do not pay outside the app.</span>
                </Step>
              </Steps>
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
  margin: 0 0 12px;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const StatusBadge = styled.div`
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
  background: ${({ $paid, theme }) => ($paid ? "rgba(34, 197, 94, 0.15)" : theme.bg)};
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

