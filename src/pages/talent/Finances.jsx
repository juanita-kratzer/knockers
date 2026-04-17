// src/pages/talent/Finances.jsx
// Entertainer finances - earnings, pending balance, history

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  Wallet,
  Clock,
  CheckCircle,
  ChevronRight,
  Calendar,
  TrendingUp,
  Download,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useEntertainerBookings, BOOKING_STATUS } from "../../hooks/useBookings";
import { useEntertainer } from "../../hooks/useEntertainers";
import { isStripeEnabled } from "../../lib/featureFlags";
import { isIdentityVerified } from "../../lib/identityVerification";
import { getConnectOnboardingLink } from "../../lib/stripeCallables";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import { logger } from "../../lib/logger";

export default function Finances() {
  const { user, userData } = useAuth();
  const { bookings, loading } = useEntertainerBookings(user?.uid);
  const { entertainer } = useEntertainer(user?.uid);
  const [payoutSetupLoading, setPayoutSetupLoading] = useState(false);

  const identityVerified = isIdentityVerified(userData, user);
  const stripeOnboardingComplete =
    entertainer?.stripe?.onboardingStatus === "COMPLETE" && entertainer?.stripe?.payoutsEnabled;
  const showPayoutBanner = isStripeEnabled() && !stripeOnboardingComplete && identityVerified;

  const handleSetUpPayouts = async () => {
    if (!user?.uid) return;
    setPayoutSetupLoading(true);
    try {
      const { onboardingUrl } = await getConnectOnboardingLink(user.uid);
      window.location.href = onboardingUrl;
    } catch (e) {
      logger.error("Payout setup error:", e);
      setPayoutSetupLoading(false);
    }
  };

  // Calculate earnings
  const stats = useMemo(() => {
    if (!bookings) return { pending: 0, available: 0, total: 0, count: 0 };

    const completed = bookings.filter((b) => b.status === BOOKING_STATUS.COMPLETED);
    const inProgress = bookings.filter(
      (b) =>
        b.status === BOOKING_STATUS.DEPOSIT_PAID ||
        b.status === BOOKING_STATUS.IN_PROGRESS
    );

    const available = completed.reduce((sum, b) => sum + (b.entertainerAmount || 0), 0);
    const pending = inProgress.reduce((sum, b) => sum + (b.entertainerAmount || 0), 0);

    return {
      pending,
      available,
      total: available + pending,
      count: completed.length,
    };
  }, [bookings]);

  // Transaction history
  const transactions = useMemo(() => {
    if (!bookings) return [];

    return bookings
      .filter((b) => b.status === BOOKING_STATUS.COMPLETED || b.paymentReleased)
      .sort((a, b) => {
        const dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt);
        const dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt);
        return dateB - dateA;
      })
      .slice(0, 20);
  }, [bookings]);

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Finances" showBack />
        <LoadingWrapper>
          <LoadingSpinner size={32} />
        </LoadingWrapper>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Finances" showBack />

      <Content>
        {/* Phase 1: Stripe Connect onboarding banner */}
        {!identityVerified && (
          <PayoutBanner $warning>
            <PayoutBannerText>Verify your identity (ID + selfie) before you can set up payouts.</PayoutBannerText>
            <PayoutSetupButton as={Link} to="/profile/verification">
              Verify Identity
            </PayoutSetupButton>
          </PayoutBanner>
        )}
        {showPayoutBanner && (
          <PayoutBanner>
            <PayoutBannerText>Set up payouts to receive booking payments.</PayoutBannerText>
            <PayoutSetupButton onClick={handleSetUpPayouts} disabled={payoutSetupLoading}>
              {payoutSetupLoading ? "Opening…" : "Set up payouts"}
            </PayoutSetupButton>
          </PayoutBanner>
        )}

        {/* Balance Cards */}
        <BalanceSection>
          <BalanceCard $primary>
            <BalanceIcon>
              <Wallet size={24} />
            </BalanceIcon>
            <BalanceInfo>
              <BalanceLabel>Available Balance</BalanceLabel>
              <BalanceAmount>${stats.available.toFixed(2)}</BalanceAmount>
            </BalanceInfo>
          </BalanceCard>

          <BalanceRow>
            <SmallCard>
              <SmallIcon>
                <Clock size={18} />
              </SmallIcon>
              <SmallLabel>Pending</SmallLabel>
              <SmallAmount>${stats.pending.toFixed(2)}</SmallAmount>
            </SmallCard>

            <SmallCard>
              <SmallIcon>
                <TrendingUp size={18} />
              </SmallIcon>
              <SmallLabel>Total Earned</SmallLabel>
              <SmallAmount>${stats.total.toFixed(2)}</SmallAmount>
            </SmallCard>
          </BalanceRow>
        </BalanceSection>

        {/* Stats Summary */}
        <StatsCard>
          <StatItem>
            <StatValue>{stats.count}</StatValue>
            <StatLabel>Completed Bookings</StatLabel>
          </StatItem>
          <StatDivider />
          <StatItem>
            <StatValue>
              ${stats.count > 0 ? (stats.total / stats.count).toFixed(0) : 0}
            </StatValue>
            <StatLabel>Avg per Booking</StatLabel>
          </StatItem>
        </StatsCard>

        {/* Payout Info */}
        <PayoutCard>
          <PayoutIcon>
            <Calendar size={20} />
          </PayoutIcon>
          <PayoutInfo>
            <PayoutTitle>Next Payout</PayoutTitle>
            <PayoutText>
              Payouts are processed every Monday. Make sure your bank details are
              up to date.
            </PayoutText>
          </PayoutInfo>
          <PayoutLink to="/settings/bank">
            <ChevronRight size={20} />
          </PayoutLink>
        </PayoutCard>

        {/* Transaction History */}
        <Section>
          <SectionHeader>
            <SectionTitle>Transaction History</SectionTitle>
            <DownloadButton disabled title="Export coming soon">
              <Download size={16} />
              Export
            </DownloadButton>
          </SectionHeader>

          {transactions.length === 0 ? (
            <EmptyState
              icon={<Wallet size={48} />}
              title="No transactions yet"
              message="Your completed booking earnings will appear here."
            />
          ) : (
            <TransactionList>
              {transactions.map((tx) => {
                const date = tx.completedAt?.toDate
                  ? tx.completedAt.toDate()
                  : new Date(tx.completedAt);

                return (
                  <TransactionItem key={tx.id} to={`/booking/${tx.id}`}>
                    <TransactionIcon>
                      <CheckCircle size={20} />
                    </TransactionIcon>
                    <TransactionInfo>
                      <TransactionTitle>{tx.clientName || "Booking"}</TransactionTitle>
                      <TransactionDate>
                        {date.toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TransactionDate>
                    </TransactionInfo>
                    <TransactionAmount>
                      +${(tx.entertainerAmount || 0).toFixed(2)}
                    </TransactionAmount>
                  </TransactionItem>
                );
              })}
            </TransactionList>
          )}
        </Section>

      </Content>
    </PageContainer>
  );
}

const Content = styled.div`
  padding: 0 16px 40px;
`;

const PayoutBanner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  margin-bottom: 20px;
  background: ${({ $warning, theme }) => ($warning ? "rgba(245, 158, 11, 0.1)" : theme.card)};
  border: 1px solid ${({ $warning, theme }) => ($warning ? "rgba(245, 158, 11, 0.3)" : theme.primary)};
  border-radius: 16px;
`;

const PayoutBannerText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
`;

const PayoutSetupButton = styled.button`
  align-self: flex-start;
  padding: 10px 20px;
  background: ${({ theme }) => theme.primary};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 60px 0;
`;

const BalanceSection = styled.div`
  margin-bottom: 20px;
`;

const BalanceCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: ${({ $primary, theme }) =>
    $primary
      ? `linear-gradient(135deg, ${theme.primary} 0%, #5fb3d4 100%)`
      : theme.card};
  border-radius: 20px;
  margin-bottom: 12px;
`;

const BalanceIcon = styled.div`
  width: 52px;
  height: 52px;
  background: rgba(26, 29, 33, 0.2);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1d21;
`;

const BalanceInfo = styled.div``;

const BalanceLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(26, 29, 33, 0.7);
  margin-bottom: 4px;
`;

const BalanceAmount = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: #1a1d21;
`;

const BalanceRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const SmallCard = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
`;

const SmallIcon = styled.div`
  color: ${({ theme }) => theme.primary};
  margin-bottom: 8px;
`;

const SmallLabel = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  margin-bottom: 4px;
`;

const SmallAmount = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const StatsCard = styled.div`
  display: flex;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  margin-bottom: 20px;
`;

const StatItem = styled.div`
  flex: 1;
  padding: 20px;
  text-align: center;
`;

const StatDivider = styled.div`
  width: 1px;
  background: ${({ theme }) => theme.border};
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;

const PayoutCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  margin-bottom: 28px;
`;

const PayoutIcon = styled.div`
  width: 44px;
  height: 44px;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.primary};
`;

const PayoutInfo = styled.div`
  flex: 1;
`;

const PayoutTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin-bottom: 4px;
`;

const PayoutText = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  line-height: 1.4;
`;

const PayoutLink = styled(Link)`
  color: ${({ theme }) => theme.muted};
`;

const Section = styled.div`
  margin-bottom: 28px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const SectionTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  margin: 0;
`;

const DownloadButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.text};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TransactionList = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  overflow: hidden;
`;

const TransactionItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  text-decoration: none;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: ${({ theme }) => theme.bgAlt};
  }
`;

const TransactionIcon = styled.div`
  width: 40px;
  height: 40px;
  background: rgba(34, 197, 94, 0.15);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #22c55e;
`;

const TransactionInfo = styled.div`
  flex: 1;
`;

const TransactionTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const TransactionDate = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  margin-top: 2px;
`;

const TransactionAmount = styled.div`
  font-weight: 700;
  color: #22c55e;
`;



