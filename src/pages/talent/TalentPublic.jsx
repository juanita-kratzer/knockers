// src/pages/talent/TalentPublic.jsx
// Public entertainer profile page

import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../context/RoleContext";
import { useEntertainer, toggleEntertainerActive } from "../../hooks/useEntertainers";
import { canUsePaidFeatures } from "../../lib/verificationFee";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";

export default function TalentPublic() {
  const { id: entertainerId } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { ageVerified, verifyAge } = useRole();
  const { entertainer, loading, error } = useEntertainer(entertainerId);
  
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const handleBook = () => {
    if (entertainer?.isAdultContent && !ageVerified) {
      setShowAgeGate(true);
      return;
    }
    navigate(`/book/${entertainerId}`);
  };

  const handleAgeVerify = async () => {
    await verifyAge();
    setShowAgeGate(false);
    navigate(`/book/${entertainerId}`);
  };

  if (loading) {
    return (
      <Container>
        <LoadingWrapper>
          <LoadingSpinner size={32} />
        </LoadingWrapper>
      </Container>
    );
  }

  if (error || !entertainer) {
    return (
      <Container>
        <ErrorMessage 
          title="Profile not found"
          error="This entertainer profile doesn't exist or has been removed."
        />
      </Container>
    );
  }

  // Check if viewing requires age verification
  if (entertainer.isAdultContent && !ageVerified && !showAgeGate) {
    return (
      <AgeGateContainer>
        <AgeGateCard>
          <AgeGateIcon>18+</AgeGateIcon>
          <AgeGateTitle>Age Restricted Content</AgeGateTitle>
          <AgeGateText>
            This profile contains adult content. You must be 18 or older to view.
          </AgeGateText>
          <AgeGateButtons>
            <AgeVerifyButton onClick={() => verifyAge()}>
              I am 18 or older
            </AgeVerifyButton>
            <AgeCancelButton to="/">
              Back
            </AgeCancelButton>
          </AgeGateButtons>
        </AgeGateCard>
      </AgeGateContainer>
    );
  }

  const photos = (entertainer.photos || []).slice(0, 10);
  const isOwner = user?.uid === entertainerId;
  const handleToggleActive = async () => {
    if (!entertainerId || togglingActive) return;
    if (!entertainer.isActive && !canUsePaidFeatures(userData, user)) {
      alert("Pay the $1.99 verification fee before going live. Go to Profile → Verification & Badges.");
      return;
    }
    if (!entertainer.isActive && entertainer.stripe?.payoutsEnabled !== true) {
      alert("Connect Stripe to receive payments before going live. Set up payouts in Finances.");
      return;
    }
    setTogglingActive(true);
    try {
      await toggleEntertainerActive(entertainerId, !entertainer.isActive);
    } catch (e) {
      setTogglingActive(false);
    }
    setTogglingActive(false);
  };

  return (
    <Container>
      {/* Photo Gallery */}
      <PhotoSection>
        {photos.length > 0 ? (
          <>
            <MainPhoto src={photos[activePhotoIndex]} alt={entertainer.displayName} />
            {photos.length > 1 && (
              <PhotoThumbnails>
                {photos.map((photo, i) => (
                  <Thumbnail 
                    key={i}
                    src={photo}
                    $active={i === activePhotoIndex}
                    onClick={() => setActivePhotoIndex(i)}
                  />
                ))}
              </PhotoThumbnails>
            )}
          </>
        ) : (
          <NoPhoto>
            <NoPhotoIcon>?</NoPhotoIcon>
            <NoPhotoText>No photos yet</NoPhotoText>
          </NoPhoto>
        )}
        
        <BackButton type="button" onClick={() => navigate(-1)}>
          Back
        </BackButton>
        
        {entertainer.isAdultContent && (
          <AdultBadge>18+</AdultBadge>
        )}
      </PhotoSection>

      {/* Profile Info */}
      <ProfileSection>
        <ProfileHeader>
          <ProfileName>{entertainer.displayName}</ProfileName>
          {entertainer.verificationStatus === "verified" && (
            <VerifiedBadge>Verified</VerifiedBadge>
          )}
          {entertainer.profileType === "hard" && (
            <PoliceCheckBadge>Police Check Verified</PoliceCheckBadge>
          )}
        </ProfileHeader>

        <CategoryTags>
          {entertainer.subCategories?.slice(0, 3).map((cat, i) => (
            <CategoryTag key={i}>{cat}</CategoryTag>
          ))}
        </CategoryTags>

        <MetaRow>
          <MetaItem>
            <MetaIcon></MetaIcon>
            {(entertainer.suburb || "Location TBA").replace(/\s*\(.*\)$/, "").trim()}
          </MetaItem>
          {entertainer.rating > 0 && (
            <MetaItem>
              <MetaIcon></MetaIcon>
              {entertainer.rating.toFixed(1)} ({entertainer.reviewCount} reviews)
            </MetaItem>
          )}
        </MetaRow>

        {entertainer.pricing?.baseRate > 0 && (
          <PriceCard>
            <PriceLabel>Starting from</PriceLabel>
            <PriceAmount>${entertainer.pricing.baseRate}</PriceAmount>
            <PriceUnit>per hour</PriceUnit>
          </PriceCard>
        )}

        {/* Bio */}
        {entertainer.bio && (
          <Section>
            <SectionTitle>About</SectionTitle>
            <BioText>{entertainer.bio}</BioText>
          </Section>
        )}

        {/* Services: included in hourly vs additional cost */}
        {(entertainer.servicesIncludedInRate?.length > 0 || entertainer.servicesExtra?.length > 0) ? (
          <>
            {entertainer.servicesIncludedInRate?.length > 0 && (
              <Section>
                <SectionTitle>Included in hourly rate</SectionTitle>
                <ServiceList>
                  {entertainer.servicesIncludedInRate.map((name, i) => (
                    <ServiceItem key={i}>{name}</ServiceItem>
                  ))}
                </ServiceList>
              </Section>
            )}
            {entertainer.servicesExtra?.length > 0 && (
              <Section>
                <SectionTitle>Additional cost (on top of hourly)</SectionTitle>
                <ServiceList>
                  {entertainer.servicesExtra.map((name, i) => (
                    <ServiceItem key={i}>{name}</ServiceItem>
                  ))}
                </ServiceList>
              </Section>
            )}
          </>
        ) : (
          (entertainer.categories?.length > 0 || entertainer.subCategories?.length > 0) && (
            <Section>
              <SectionTitle>Services</SectionTitle>
              <ServiceList>
                {[...(entertainer.categories || []), ...(entertainer.subCategories || [])].map((cat, i) => (
                  <ServiceItem key={i}>{cat}</ServiceItem>
                ))}
              </ServiceList>
            </Section>
          )
        )}

        {/* Availability */}
        {entertainer.availability && (
          <Section>
            <SectionTitle>Availability</SectionTitle>
            <AvailabilityGrid>
              {Object.entries(entertainer.availability).map(([day, available]) => (
                <AvailabilityDay key={day} $available={available}>
                  {day.slice(0, 3)}
                </AvailabilityDay>
              ))}
            </AvailabilityGrid>
          </Section>
        )}
      </ProfileSection>

      {/* Owner: Active toggle (show on map) */}
      {isOwner && (
        <Section>
          <ActiveCard $active={entertainer.isActive}>
            <ActiveRow>
              <ActiveLabel>Active</ActiveLabel>
              <ActiveSwitch
                type="button"
                role="switch"
                aria-checked={entertainer.isActive}
                onClick={handleToggleActive}
                disabled={togglingActive}
                $active={entertainer.isActive}
              >
                <ActiveSwitchThumb $active={entertainer.isActive} />
              </ActiveSwitch>
            </ActiveRow>
            <ActiveHint>When active you appear on the map.</ActiveHint>
          </ActiveCard>
        </Section>
      )}

      {/* Action Bar */}
      {!isOwner && (
        <ActionBar>
          <BookButton onClick={handleBook}>
            Book Now
          </BookButton>
        </ActionBar>
      )}

      {isOwner && (
        <ActionBar>
          <EditButton to="/talent/edit">
            Edit Profile
          </EditButton>
        </ActionBar>
      )}

      {/* Age Gate Modal */}
      {showAgeGate && (
        <AgeGateOverlay>
          <AgeGateCard>
            <AgeGateIcon>18+</AgeGateIcon>
            <AgeGateTitle>Age Verification</AgeGateTitle>
            <AgeGateText>
              You must be 18 or older to book this entertainer.
            </AgeGateText>
            <AgeGateButtons>
              <AgeVerifyButton onClick={handleAgeVerify}>
                I am 18 or older
              </AgeVerifyButton>
              <AgeCancelButtonBtn onClick={() => setShowAgeGate(false)}>
                Cancel
              </AgeCancelButtonBtn>
            </AgeGateButtons>
          </AgeGateCard>
        </AgeGateOverlay>
      )}
    </Container>
  );
}

const Container = styled.div`
  min-height: 100%;
  background: ${({ theme }) => theme.bg};
  padding-bottom: 100px;
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

const PhotoSection = styled.div`
  position: relative;
  background: ${({ theme }) => theme.card};
`;

const MainPhoto = styled.img`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
`;

const NoPhoto = styled.div`
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.dark};
`;

const NoPhotoIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`;

const NoPhotoText = styled.p`
  color: ${({ theme }) => theme.muted};
`;

const PhotoThumbnails = styled.div`
  display: flex;
  gap: 8px;
  padding: 12px;
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Thumbnail = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid ${({ $active, theme }) => $active ? theme.primary : "transparent"};
  opacity: ${({ $active }) => $active ? 1 : 0.6};
  cursor: pointer;
`;

const BackButton = styled.button`
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 0.4rem 1.1rem;
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.45);
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  backdrop-filter: blur(8px);
  cursor: pointer;
`;

const AdultBadge = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  color: #ef4444;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 8px;
`;

const ProfileSection = styled.div`
  padding: 20px 16px;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
`;

const ProfileName = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const VerifiedBadge = styled.span`
  padding: 4px 10px;
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
`;

const PoliceCheckBadge = styled.span`
  padding: 4px 10px;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
`;

const CategoryTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const CategoryTag = styled.span`
  padding: 6px 12px;
  background: ${({ theme }) => theme.hover};
  color: ${({ theme }) => theme.primary};
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 20px;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
`;

const MetaIcon = styled.span`
  font-size: 1rem;
`;

const PriceCard = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  margin-bottom: 24px;
`;

const PriceLabel = styled.p`
  margin: 0 0 4px 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
`;

const PriceAmount = styled.span`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
`;

const PriceUnit = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
  margin-left: 4px;
`;

const Section = styled.section`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const BioText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.muted};
  line-height: 1.6;
`;

const ServiceList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ServiceItem = styled.span`
  padding: 8px 14px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.text};
`;

const AvailabilityGrid = styled.div`
  display: flex;
  gap: 8px;
`;

const AvailabilityDay = styled.div`
  flex: 1;
  padding: 10px 6px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: 8px;
  background: ${({ $available, theme }) => $available ? theme.hover : theme.card};
  color: ${({ $available, theme }) => $available ? theme.primary : theme.muted};
  border: 1px solid ${({ $available, theme }) => $available ? theme.primary : theme.border};
`;

const ActionBar = styled.div`
  position: fixed;
  bottom: 80px;
  left: 0;
  right: 0;
  padding: 16px;
  background: ${({ theme }) => theme.bg};
  border-top: 1px solid ${({ theme }) => theme.border};
  
  @media (min-width: 768px) {
    bottom: 0;
  }
`;

const BookButton = styled.button`
  width: 100%;
  padding: 16px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 14px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  
  &:active {
    opacity: 0.9;
  }
`;

const EditButton = styled(Link)`
  display: block;
  width: 100%;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 14px;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
`;

const ActiveCard = styled.div`
  padding: 20px;
  background: ${({ theme, $active }) => ($active ? "rgba(34, 197, 94, 0.08)" : theme.card)};
  border: 1px solid ${({ theme, $active }) => ($active ? "#22c55e" : theme.border)};
  border-radius: 16px;
`;

const ActiveRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
`;

const ActiveLabel = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const ActiveHint = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
  line-height: 1.4;
`;

const ActiveSwitch = styled.button`
  flex-shrink: 0;
  width: 52px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 14px;
  background: ${({ theme, $active }) => ($active ? "#22c55e" : theme.border)};
  cursor: pointer;
  transition: background 0.2s ease;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }
`;

const ActiveSwitchThumb = styled.span`
  display: block;
  width: 24px;
  height: 24px;
  margin: 2px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
  transform: translateX(${({ $active }) => ($active ? "24px" : "0")});
`;

// Age Gate Styles
const AgeGateContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: ${({ theme }) => theme.bg};
`;

const AgeGateOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
`;

const AgeGateCard = styled.div`
  background: ${({ theme }) => theme.card};
  border-radius: 20px;
  padding: 32px 24px;
  max-width: 360px;
  width: 100%;
  text-align: center;
`;

const AgeGateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const AgeGateTitle = styled.h2`
  margin: 0 0 12px 0;
  font-size: 1.3rem;
  color: ${({ theme }) => theme.text};
`;

const AgeGateText = styled.p`
  margin: 0 0 24px 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.muted};
  line-height: 1.5;
`;

const AgeGateButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AgeVerifyButton = styled.button`
  padding: 14px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
`;

const AgeCancelButton = styled(Link)`
  padding: 0.4rem 1.1rem;
  background: transparent;
  color: ${({ theme }) => theme.primary};
  border: 1px solid ${({ theme }) => theme.primary};
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
`;

const AgeCancelButtonBtn = styled.button`
  padding: 14px 24px;
  background: transparent;
  color: ${({ theme }) => theme.muted};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  font-size: 1rem;
  cursor: pointer;
`;
