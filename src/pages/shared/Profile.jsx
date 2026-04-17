// src/pages/shared/Profile.jsx
// Profile: stats, edit profile, soft/hard profile, switch dashboard, become entertainer

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { useRole, ROLES } from "../../context/RoleContext";
import { useMyEntertainerProfile } from "../../hooks/useEntertainers";
import { useClientBookings, useEntertainerBookings } from "../../hooks/useBookings";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  User,
  Theater,
  MapPin,
  ShieldCheck,
  ArrowRightLeft,
  ChevronRight,
  Clock,
  Heart,
  FileText,
  Edit3,
  Settings as SettingsGear,
} from "lucide-react";
import { logger } from "../../lib/logger";

function calculateAge(dob) {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, userData, logout, refetchUserData } = useAuth();
  const { role, isEntertainer, isClient, hasEntertainerProfile, setRole } = useRole();
  const { entertainer } = useMyEntertainerProfile(user?.uid ?? null);
  const { bookings: clientBookings } = useClientBookings(user?.uid);
  const { bookings: entertainerBookings } = useEntertainerBookings(isEntertainer ? user?.uid : null);

  const totalBookingsAsClient = clientBookings?.length ?? 0;
  const repeatEntertainersCount = useMemo(() => {
    if (!clientBookings?.length) return 0;
    const byEnt = {};
    clientBookings.forEach((b) => {
      const id = b.entertainerId;
      if (id) byEnt[id] = (byEnt[id] || 0) + 1;
    });
    return Object.values(byEnt).filter((c) => c > 1).length;
  }, [clientBookings]);

  const profileType = isEntertainer
    ? (entertainer?.profileType || "soft")
    : (userData?.profileType || "soft");
  const isHardProfile = profileType === "hard";

  const handleSwitchDashboard = async (targetRole) => {
    try {
      await setRole(targetRole);
      await refetchUserData();
      navigate(targetRole === ROLES.ENTERTAINER ? "/talent" : "/client", { replace: true });
    } catch (e) {
      logger.error("Switch role failed:", e);
    }
  };

  // Show switch when user has an entertainer profile (from context or from direct fetch) or is currently in entertainer role
  const canSwitchDashboard = !!(hasEntertainerProfile || isEntertainer || entertainer);

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await logout();
    }
  };

  if (!user) {
    return (
      <Container>
        <GuestContent>
          <GuestIconWrapper><User size={48} /></GuestIconWrapper>
          <GuestTitle>Sign in to view your profile</GuestTitle>
          <GuestText>Create an account to book entertainers or join as talent</GuestText>
          <GuestButtons>
            <PrimaryButton to="/client/signup">Create Account</PrimaryButton>
            <SecondaryButton to="/client/login">Sign In</SecondaryButton>
          </GuestButtons>
          <EntertainerPrompt>
            Are you an entertainer? <EntertainerLink to="/talent/signup">Join here</EntertainerLink>
          </EntertainerPrompt>
        </GuestContent>
      </Container>
    );
  }

  const fullName = entertainer?.displayName || userData?.name || "";
  const bookingsCount = isEntertainer
    ? (entertainerBookings?.length || 0)
    : totalBookingsAsClient;

  return (
    <Container>
      <Header>
        <HeaderTitle>{userData?.username ? `@${userData.username}` : "Profile"}</HeaderTitle>
      </Header>

      {/* Profile Info */}
      <ProfileSection>
        <Avatar>
          {entertainer?.photos?.[0] ? (
            <img src={entertainer.photos[0]} alt={fullName || "Profile"} />
          ) : (
            (fullName || user.email)?.[0]?.toUpperCase() || "?"
          )}
        </Avatar>
        
        <ProfileInfo>
          {fullName && <DisplayName>{fullName}</DisplayName>}
          {userData?.username && <UsernameText>@{userData.username}</UsernameText>}
          {user.email && <InfoLine>{user.email}</InfoLine>}
          {userData?.dateOfBirth && (() => { const age = calculateAge(userData.dateOfBirth); return age !== null ? <InfoLine>Age: {age}</InfoLine> : null; })()}
          <ProfileTypeBadge $hard={isHardProfile}>
            {isHardProfile ? "Hard Profile" : "Soft Profile"}
          </ProfileTypeBadge>
          <RoleBadge $role={role}>
            {isEntertainer ? <><Theater size={12} /> Entertainer</> : isClient ? <><User size={12} /> Client</> : "User"}
          </RoleBadge>
          {isEntertainer && entertainer?.suburb && (
            <Location><MapPin size={14} /> {(entertainer.suburb || "").replace(/\s*\(.*\)$/, "").trim()}</Location>
          )}
        </ProfileInfo>
      </ProfileSection>

      {/* Switch dashboard (when user has both client and entertainer) — near top so it’s easy to find */}
      {canSwitchDashboard && (
        <SwitchSection>
          <SwitchText>
            {isEntertainer ? "View as client" : "View as entertainer"}
          </SwitchText>
          <SwitchDashboardButton
            onClick={() => handleSwitchDashboard(isEntertainer ? ROLES.CLIENT : ROLES.ENTERTAINER)}
          >
            <ArrowRightLeft size={18} />
            Switch to {isEntertainer ? "Client" : "Entertainer"} Dashboard
          </SwitchDashboardButton>
        </SwitchSection>
      )}

      {/* View my public profile (entertainer) — what clients see on map / explore */}
      {(entertainer || isEntertainer) && user?.uid && (
        <ActionsSection>
          <PublicProfileButton to={`/talent/${user.uid}`}>
            <Theater size={18} />
            View my public profile
          </PublicProfileButton>
        </ActionsSection>
      )}

      {/* Stats - Bookings made & Repeat entertainers clickable → booking history (per knockers-fixes) */}
      <StatsRow>
        {isClient ? (
          <StatLink to="/bookings/history">
            <StatNumber>{bookingsCount}</StatNumber>
            <StatLabel>Bookings made</StatLabel>
          </StatLink>
        ) : (
          <StatItem>
            <StatNumber>{bookingsCount}</StatNumber>
            <StatLabel>Bookings</StatLabel>
          </StatItem>
        )}
        {isClient && (
          <StatLink to="/bookings/history">
            <StatNumber>{repeatEntertainersCount}</StatNumber>
            <StatLabel>Repeat entertainers</StatLabel>
          </StatLink>
        )}
        {isEntertainer && (
          <>
            <StatItem>
              <StatNumber>{entertainer?.rating?.toFixed(1) ?? "-"}</StatNumber>
              <StatLabel>Rating</StatLabel>
            </StatItem>
            <StatItem>
              <StatNumber>{entertainer?.reviewCount ?? 0}</StatNumber>
              <StatLabel>Reviews</StatLabel>
            </StatItem>
          </>
        )}
      </StatsRow>

      {/* Bio (Entertainer only) */}
      {isEntertainer && entertainer?.bio && (
        <BioSection>
          <BioText>{entertainer.bio}</BioText>
        </BioSection>
      )}

      {/* Account section */}
      <MenuSection>
        <MenuSectionTitle>Account</MenuSectionTitle>
        <MenuList>
          <MenuItem to="/profile/edit">
            <MenuIcon><Edit3 size={20} /></MenuIcon>
            <MenuLabel>
              <MenuTitle>Edit Profile</MenuTitle>
              <MenuDesc>Name, email, phone, profile photo</MenuDesc>
            </MenuLabel>
            <ChevronRight size={20} />
          </MenuItem>
          <MenuItem to="/profile/verification">
            <MenuIcon><ShieldCheck size={20} /></MenuIcon>
            <MenuLabel>
              <MenuTitle>Verification & Badges</MenuTitle>
              <MenuDesc>{isHardProfile ? "Fully verified" : "Upgrade your profile"}</MenuDesc>
            </MenuLabel>
            <ChevronRight size={20} />
          </MenuItem>
          <MenuItem to="/settings">
            <MenuIcon><SettingsGear size={20} /></MenuIcon>
            <MenuLabel>
              <MenuTitle>Settings</MenuTitle>
              <MenuDesc>Password, notifications, payments, legal</MenuDesc>
            </MenuLabel>
            <ChevronRight size={20} />
          </MenuItem>
        </MenuList>
      </MenuSection>

      {/* Activity section */}
      <MenuSection>
        <MenuSectionTitle>Activity</MenuSectionTitle>
        <MenuList>
          <MenuItem to="/bookings/history">
            <MenuIcon><Clock size={20} /></MenuIcon>
            <MenuLabel>
              <MenuTitle>Booking History</MenuTitle>
              <MenuDesc>Past and upcoming bookings</MenuDesc>
            </MenuLabel>
            <ChevronRight size={20} />
          </MenuItem>
          <MenuItem to={isEntertainer ? "/saved/clients" : "/saved/entertainers"}>
            <MenuIcon><Heart size={20} /></MenuIcon>
            <MenuLabel>
              <MenuTitle>{isEntertainer ? "Saved Clients" : "Saved Entertainers"}</MenuTitle>
              <MenuDesc>Your favourites list</MenuDesc>
            </MenuLabel>
            <ChevronRight size={20} />
          </MenuItem>
          <MenuItem to="/receipts">
            <MenuIcon><FileText size={20} /></MenuIcon>
            <MenuLabel>
              <MenuTitle>Receipts</MenuTitle>
              <MenuDesc>Verification and booking receipts</MenuDesc>
            </MenuLabel>
            <ChevronRight size={20} />
          </MenuItem>
        </MenuList>
      </MenuSection>

      {/* Become Entertainer (client without entertainer profile) */}
      {isClient && !hasEntertainerProfile && (
        <SwitchSection>
          <SwitchText>Want to offer your services?</SwitchText>
          <SwitchButton to="/talent/signup">Become an Entertainer</SwitchButton>
        </SwitchSection>
      )}

      {/* Logout */}
      <LogoutSection>
        <LogoutButton onClick={handleLogout}>
          Sign Out
        </LogoutButton>
      </LogoutSection>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100%;
  background: ${({ theme }) => theme.bg};
  padding-bottom: 100px;
`;

const GuestContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  padding: 24px;
  text-align: center;
`;

const GuestIconWrapper = styled.div`
  color: ${({ theme }) => theme.primary};
  margin-bottom: 16px;
`;

const GuestTitle = styled.h2`
  margin: 0 0 8px 0;
  font-size: 1.3rem;
  color: ${({ theme }) => theme.text};
`;

const GuestText = styled.p`
  margin: 0 0 24px 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.muted};
  max-width: 280px;
`;

const GuestButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 280px;
`;

const PrimaryButton = styled(Link)`
  padding: 14px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 12px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
`;

const SecondaryButton = styled(Link)`
  padding: 14px 24px;
  background: transparent;
  color: ${({ theme }) => theme.text};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  font-weight: 500;
  text-align: center;
  text-decoration: none;
`;

const EntertainerPrompt = styled.p`
  margin-top: 24px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const EntertainerLink = styled(Link)`
  color: ${({ theme }) => theme.primary};
  font-weight: 500;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const ProfileSection = styled.section`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 20px;
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${({ theme }) => theme.card};
  border: 2px solid ${({ theme }) => theme.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
  overflow: hidden;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const DisplayName = styled.h2`
  margin: 0 0 6px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const UsernameText = styled.p`
  margin: 0 0 4px 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
`;

const InfoLine = styled.p`
  margin: 2px 0 0 0;
  font-size: 0.82rem;
  color: ${({ theme }) => theme.muted};
`;

const ProfileTypeBadge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  margin-top: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 20px;
  background: ${({ $hard, theme }) => $hard ? "rgba(34, 197, 94, 0.15)" : theme.bgAlt};
  color: ${({ $hard, theme }) => $hard ? "#22c55e" : theme.muted};
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: ${({ $role, theme }) => 
    $role === "entertainer" ? theme.hover : "rgba(255, 255, 255, 0.1)"
  };
  color: ${({ $role, theme }) => 
    $role === "entertainer" ? theme.primary : theme.muted
  };
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 20px;
  margin-bottom: 4px;
`;

const Location = styled.p`
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 0 0 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 16px 20px;
  border-top: 1px solid ${({ theme }) => theme.border};
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatLink = styled(Link)`
  text-align: center;
  text-decoration: none;
  color: inherit;
  display: block;
  padding: 4px 0;
  &:active {
    opacity: 0.9;
  }
`;

const StatNumber = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.muted};
  margin-top: 2px;
`;

const BioSection = styled.section`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const BioText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
  line-height: 1.5;
`;

const ActionsSection = styled.section`
  padding: 20px;
`;

const ActionButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 14px;
  color: ${({ theme }) => theme.text};
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
  margin-bottom: 12px;
  
  &:active {
    background: ${({ theme }) => theme.hoverDark};
  }
`;

const PublicProfileButton = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.primary};
  border-radius: 14px;
  color: ${({ theme }) => theme.primary};
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  
  &:active {
    background: ${({ theme }) => theme.hoverDark};
  }
`;

const ActionIconWrapper = styled.span`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.primary};
`;

const MenuSection = styled.section`
  padding: 0 20px 8px;
`;

const MenuSectionTitle = styled.h2`
  font-size: 0.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.muted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 10px 4px;
`;

const MenuList = styled.div`
  background: ${({ theme }) => theme.card};
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border};
`;

const MenuItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  text-decoration: none;
  color: ${({ theme }) => theme.text};
  border-bottom: 1px solid ${({ theme }) => theme.border};
  &:last-child { border-bottom: none; }
  &:active { background: ${({ theme }) => theme.bgAlt}; }
  svg:last-child { color: ${({ theme }) => theme.muted}; }
`;

const MenuIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.bgAlt};
  color: ${({ theme }) => theme.primary};
`;

const MenuLabel = styled.div`
  flex: 1;
  min-width: 0;
`;

const MenuTitle = styled.div`
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
`;

const MenuDesc = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  margin-top: 2px;
`;

const SwitchSection = styled.section`
  padding: 20px;
  margin: 0 20px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  text-align: center;
`;

const SwitchText = styled.p`
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.muted};
`;

const SwitchButton = styled(Link)`
  display: inline-block;
  padding: 12px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border-radius: 10px;
  font-weight: 600;
  text-decoration: none;
`;

const SwitchDashboardButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  &:active {
    opacity: 0.9;
  }
`;

const LogoutSection = styled.section`
  padding: 24px 20px;
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 14px;
  background: transparent;
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  
  &:active {
    background: rgba(239, 68, 68, 0.1);
  }
`;
