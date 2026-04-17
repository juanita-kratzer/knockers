// Phase 6: Receipts — verification (IAP) and booking (Stripe)

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import styled from "styled-components";

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const verifiedAt = userData?.verifiedAt?.toDate?.() ?? userData?.verifiedAt;
  const paid = userData?.verificationFeePaid === true;
  const waived = !!userData?.verificationFeeWaivedBy;

  return (
    <PageContainer>
      <PageHeader title="Receipts" showBack />
      <Content>
        <Section>
          <SectionTitle>Verification fee</SectionTitle>
          {paid && (
            <ReceiptLine>
              <strong>Paid via Apple</strong>
              {verifiedAt && (
                <span> — {new Date(verifiedAt).toLocaleDateString()}</span>
              )}
              <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
                Receipt is stored with your account. For Apple receipt details, see your Apple ID purchase history.
              </p>
            </ReceiptLine>
          )}
          {waived && !paid && (
            <ReceiptLine>
              <strong>Waived by admin</strong>
            </ReceiptLine>
          )}
          {!paid && !waived && (
            <ReceiptLine>
              <span style={{ color: "var(--muted)", display: "block", marginBottom: 12 }}>
                You haven't paid the verification fee yet.
              </span>
              <PayButton onClick={() => navigate("/settings/verification")}>
                Pay Verification Fee
              </PayButton>
            </ReceiptLine>
          )}
        </Section>
        <Section>
          <SectionTitle>Booking receipts (Stripe)</SectionTitle>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            After you pay a deposit, Stripe sends a receipt to your email. Platform fee: $30 per booking.
          </p>
        </Section>
      </Content>
    </PageContainer>
  );
}

const Content = styled.div`
  padding: 16px;
`;

const Section = styled.section`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const ReceiptLine = styled.div`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
`;

const PayButton = styled.button`
  padding: 12px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
`;
