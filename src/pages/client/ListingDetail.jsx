// src/pages/client/ListingDetail.jsx
// View listing and applications; accept one to create a booking

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import {
  useListing,
  useListingApplications,
  acceptApplication,
  rejectApplication,
  closeListing,
  LISTING_STATUS,
  APPLICATION_STATUS,
} from "../../hooks/useListings";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import { logger } from "../../lib/logger";

export default function ListingDetail() {
  const { id: listingId } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { listing, loading: listingLoading } = useListing(listingId);
  const { applications, loading: appsLoading } = useListingApplications(listingId);
  const [acceptingId, setAcceptingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [closing, setClosing] = useState(false);

  const pendingApplications = applications.filter((a) => a.status === APPLICATION_STATUS.PENDING);

  const handleAccept = async (applicationId) => {
    if (!listing || !user) return;
    if (!confirm("Accept this entertainer? A booking will be created and they'll be notified.")) return;
    setAcceptingId(applicationId);
    try {
      const application = applications.find((a) => a.id === applicationId);
      const bookingId = await acceptApplication(
        listingId,
        applicationId,
        listing,
        application,
        user.uid,
        userData?.name || user.email,
        user.email,
        userData?.phone || null
      );
      navigate(`/booking/${bookingId}`, { replace: true });
    } catch (err) {
      logger.error("Accept application error:", err);
      alert("Failed to accept. Please try again.");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (applicationId) => {
    if (!confirm("Decline this application?")) return;
    setRejectingId(applicationId);
    try {
      await rejectApplication(applicationId);
    } catch (err) {
      logger.error("Reject error:", err);
    } finally {
      setRejectingId(null);
    }
  };

  const handleCloseListing = async () => {
    if (!confirm("Close this listing? No one will be able to apply.")) return;
    setClosing(true);
    try {
      await closeListing(listingId);
      navigate("/client", { replace: true });
    } catch (err) {
      logger.error("Close listing error:", err);
    } finally {
      setClosing(false);
    }
  };

  if (!listing && !listingLoading) {
    return (
      <PageContainer>
        <PageHeader title="Listing" showBack />
        <ErrorMessage title="Listing not found" error="This listing doesn't exist or was removed." />
      </PageContainer>
    );
  }

  if (listingLoading || !listing) {
    return (
      <PageContainer>
        <PageHeader title="Listing" showBack />
        <LoadingWrapper><LoadingSpinner size={32} /></LoadingWrapper>
      </PageContainer>
    );
  }

  if (listing.clientId !== user?.uid) {
    return (
      <PageContainer>
        <PageHeader title="Listing" showBack />
        <ErrorMessage title="Access denied" error="This listing doesn't belong to you." />
      </PageContainer>
    );
  }

  const isOpen = listing.status === LISTING_STATUS.OPEN;

  return (
    <PageContainer>
      <PageHeader title={listing.title || "Listing"} showBack />

      <Content>
        <ListingCard>
          {listing.description && <Description>{listing.description}</Description>}
          <Meta>
            {listing.location && <MetaItem>📍 {listing.location}</MetaItem>}
            {listing.eventDate && (
              <MetaItem>
                📅 {formatDate(listing.eventDate)}
                {listing.eventTime && ` · ${listing.eventTime}`}
              </MetaItem>
            )}
            {listing.duration && <MetaItem>⏱ {listing.duration}h</MetaItem>}
            {listing.budget != null && listing.budget > 0 && (
              <MetaItem>Budget: ${listing.budget}</MetaItem>
            )}
          </Meta>
          {isOpen && (
            <CloseRow>
              <CloseButton type="button" onClick={handleCloseListing} disabled={closing}>
                {closing ? "..." : "Close listing"}
              </CloseButton>
            </CloseRow>
          )}
        </ListingCard>

        <SectionTitle>Applications {pendingApplications.length ? `(${pendingApplications.length})` : ""}</SectionTitle>

        {appsLoading ? (
          <LoadingWrapper><LoadingSpinner size={28} /></LoadingWrapper>
        ) : pendingApplications.length === 0 ? (
          <EmptyApplications>
            {isOpen
              ? "No applications yet. Your listing is live — entertainers can apply from their Listings tab."
              : "No pending applications."}
          </EmptyApplications>
        ) : (
          <ApplicationList>
            {pendingApplications.map((app) => (
              <ApplicationCard key={app.id}>
                <AppHeader>
                  <AppAvatar>
                    {app.entertainerPhoto ? (
                      <img src={app.entertainerPhoto} alt="" />
                    ) : (
                      app.entertainerName?.[0]?.toUpperCase() || "E"
                    )}
                  </AppAvatar>
                  <AppInfo>
                    <AppName>{app.entertainerName || "Entertainer"}</AppName>
                    {app.message && <AppMessage>{app.message}</AppMessage>}
                  </AppInfo>
                </AppHeader>
                <AppActions>
                  <AcceptBtn
                    type="button"
                    onClick={() => handleAccept(app.id)}
                    disabled={acceptingId !== null}
                  >
                    {acceptingId === app.id ? "..." : "Accept"}
                  </AcceptBtn>
                  <RejectBtn
                    type="button"
                    onClick={() => handleReject(app.id)}
                    disabled={rejectingId !== null}
                  >
                    {rejectingId === app.id ? "..." : "Decline"}
                  </RejectBtn>
                </AppActions>
              </ApplicationCard>
            ))}
          </ApplicationList>
        )}
      </Content>
    </PageContainer>
  );
}

function formatDate(v) {
  if (!v) return "";
  const d = v.toDate ? v.toDate() : new Date(v);
  return d.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
}

const Content = styled.div`
  padding: 16px;
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 24px;
`;

const ListingCard = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
`;

const Description = styled.p`
  margin: 0 0 12px 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
  line-height: 1.5;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
`;

const MetaItem = styled.span``;

const CloseRow = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.border};
`;

const CloseButton = styled.button`
  padding: 10px 16px;
  background: transparent;
  color: ${({ theme }) => theme.muted};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
  }
`;

const SectionTitle = styled.h2`
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const EmptyApplications = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.muted};
  padding: 16px 0;
`;

const ApplicationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ApplicationCard = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 14px;
  padding: 16px;
`;

const AppHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
`;

const AppAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => theme.hover};
  color: ${({ theme }) => theme.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AppInfo = styled.div`
  flex: 1;
`;

const AppName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin-bottom: 4px;
`;

const AppMessage = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
  line-height: 1.4;
`;

const AppActions = styled.div`
  display: flex;
  gap: 10px;
`;

const AcceptBtn = styled.button`
  flex: 1;
  padding: 12px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  &:disabled {
    opacity: 0.7;
  }
`;

const RejectBtn = styled.button`
  flex: 1;
  padding: 12px;
  background: transparent;
  color: ${({ theme }) => theme.muted};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
  }
`;
