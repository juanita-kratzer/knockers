// src/pages/talent/Listings.jsx
// Browse client job listings and apply

import { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { useMyEntertainerProfile } from "../../hooks/useEntertainers";
import { useOpenListings, useMyApplications, applyToListing, APPLICATION_STATUS } from "../../hooks/useListings";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import PoliceCheckPrompt, { shouldShowPoliceCheckPrompt } from "../../components/PoliceCheckPrompt";
import { logger } from "../../lib/logger";

export default function Listings() {
  const { user, userData } = useAuth();
  const { entertainer } = useMyEntertainerProfile(user?.uid);
  const { listings, loading, error } = useOpenListings();
  const { applicationIdsByListing } = useMyApplications(user?.uid);
  const [applyingId, setApplyingId] = useState(null);
  const [showPolicePrompt, setShowPolicePrompt] = useState(() => shouldShowPoliceCheckPrompt(userData));

  const handleApply = async (listingId) => {
    setApplyingId(listingId);
    try {
      await applyToListing(listingId, {
        entertainerId: user.uid,
        entertainerName: entertainer?.displayName || userData?.name || user.email,
        entertainerPhoto: entertainer?.photos?.[0] || null,
        message: null,
      });
    } catch (err) {
      logger.error("Apply error:", err);
      alert("Failed to apply. Please try again.");
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Listings</Title>
          <Subtitle>Apply to jobs posted by clients</Subtitle>
        </Header>
        <LoadingWrapper><LoadingSpinner size={32} /></LoadingWrapper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Title>Listings</Title>
        </Header>
        <ErrorMessage error={error} onRetry={() => window.location.reload()} />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Listings</Title>
        <Subtitle>Apply to jobs posted by clients</Subtitle>
      </Header>

      {listings.length === 0 ? (
        <EmptyState>
          <EmptyText>No open listings right now</EmptyText>
          <EmptySubtext>Clients can post what they're looking for — check back later.</EmptySubtext>
        </EmptyState>
      ) : (
        <List>
          {listings.map((listing) => {
            const myApp = applicationIdsByListing[listing.id];
            const alreadyApplied = !!myApp;
            const appliedStatus = myApp?.status;

            return (
              <Card key={listing.id}>
                <CardTop>
                  <CardTitle>{listing.title || "Untitled"}</CardTitle>
                  {listing.location && <CardMeta>📍 {listing.location}</CardMeta>}
                  {(listing.eventDate || listing.eventTime) && (
                    <CardMeta>
                      📅 {listing.eventDate ? formatDate(listing.eventDate) : ""}
                      {listing.eventTime && ` · ${listing.eventTime}`}
                    </CardMeta>
                  )}
                  {listing.description && (
                    <CardDescription>{truncate(listing.description, 120)}</CardDescription>
                  )}
                  {listing.budget != null && listing.budget > 0 && (
                    <CardBudget>Budget: ${listing.budget}</CardBudget>
                  )}
                </CardTop>
                <CardActions>
                  {alreadyApplied ? (
                    <AppliedBadge>
                      {appliedStatus === APPLICATION_STATUS.ACCEPTED
                        ? "Accepted"
                        : appliedStatus === APPLICATION_STATUS.REJECTED
                        ? "Declined"
                        : "Applied"}
                    </AppliedBadge>
                  ) : (
                    <ApplyButton
                      type="button"
                      onClick={() => handleApply(listing.id)}
                      disabled={applyingId !== null}
                    >
                      {applyingId === listing.id ? (
                        <LoadingSpinner size={18} inline color="#1a1d21" />
                      ) : (
                        "Apply"
                      )}
                    </ApplyButton>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </List>
      )}

      <PoliceCheckPrompt
        show={showPolicePrompt}
        onDismiss={() => setShowPolicePrompt(false)}
      />
    </Container>
  );
}

function formatDate(v) {
  if (!v) return "";
  const d = v.toDate ? v.toDate() : new Date(v);
  return d.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
}

function truncate(str, len) {
  if (!str) return "";
  return str.length <= len ? str : str.slice(0, len) + "…";
}

const Container = styled.div`
  min-height: 100%;
  background: ${({ theme }) => theme.bg};
  padding-bottom: 100px;
`;

const Header = styled.header`
  padding: 20px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const Title = styled.h1`
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

const EmptyState = styled.div`
  padding: 40px 24px;
  text-align: center;
`;

const EmptyText = styled.p`
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const EmptySubtext = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
`;

const List = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Card = styled.article`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  padding: 18px;
`;

const CardTop = styled.div`
  margin-bottom: 14px;
`;

const CardTitle = styled.h2`
  margin: 0 0 8px 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const CardMeta = styled.p`
  margin: 0 0 4px 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const CardDescription = styled.p`
  margin: 8px 0 0 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text};
  line-height: 1.45;
`;

const CardBudget = styled.p`
  margin: 8px 0 0 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.primary};
`;

const CardActions = styled.div`
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.border};
`;

const ApplyButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const AppliedBadge = styled.span`
  display: inline-block;
  padding: 10px 16px;
  background: ${({ theme }) => theme.hover};
  color: ${({ theme }) => theme.muted};
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
`;
