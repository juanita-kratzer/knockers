// src/components/ProtectedRoute.jsx
// Route guards for role-based access

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRole, ROLES } from "../context/RoleContext";
import { isAppleReviewAccount } from "../lib/appleReview";
import LoadingSpinner from "./LoadingSpinner";

/**
 * Requires user to be logged in
 */
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * Requires user to be a client
 */
export function RequireClient({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Apple review account: allow access to client routes regardless of current role (dual-role override)
  if (isAppleReviewAccount(user)) {
    return children;
  }

  // If no role set yet, allow access (they'll set role during onboarding)
  if (!role) {
    return children;
  }

  if (role !== ROLES.CLIENT && role !== ROLES.ADMIN) {
    return <Navigate to="/talent" replace />;
  }

  return children;
}

/**
 * Requires user to be an entertainer
 */
export function RequireEntertainer({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Apple review account: allow access to entertainer routes regardless of current role (dual-role override)
  if (isAppleReviewAccount(user)) {
    return children;
  }

  // If no role set yet, redirect to signup choice
  if (!role) {
    return <Navigate to="/signup" replace />;
  }

  if (role !== ROLES.ENTERTAINER && role !== ROLES.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * Requires user to be an admin. Non-admins are redirected to home.
 */
export function RequireAdmin({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role !== ROLES.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * Requires age verification for adult content
 */
export function RequireAgeVerification({ children, showGate = true }) {
  const { ageVerified, verifyAge, loading } = useRole();

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!ageVerified && showGate) {
    return <AgeGate onVerify={verifyAge} />;
  }

  return children;
}

/**
 * Redirect if already logged in - redirects based on user role
 */
export function RedirectIfAuth({ children, to }) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  if (authLoading || roleLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (user) {
    // If a specific redirect was provided, use it
    if (to) {
      return <Navigate to={to} replace />;
    }
    // Otherwise, redirect based on role
    if (role === ROLES.ENTERTAINER) {
      return <Navigate to="/talent" replace />;
    }
    // Default to home for clients and users without role
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * For /talent/signup: only redirect to /talent if user already has an entertainer profile.
 * Lets logged-in clients complete "Join as entertainer" without being sent to map.
 */
export function RedirectIfEntertainer({ children, to = "/talent" }) {
  const { user, loading: authLoading } = useAuth();
  const { hasEntertainerProfile, loading: roleLoading } = useRole();

  if (authLoading || roleLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (user && hasEntertainerProfile) {
    return <Navigate to={to} replace />;
  }

  return children;
}

// Age verification gate component
import styled from "styled-components";

function AgeGate({ onVerify }) {
  return (
    <GateContainer>
      <GateCard>
        <GateIcon>18+</GateIcon>
        <GateTitle>Age Verification Required</GateTitle>
        <GateText>
          This content is restricted to users 18 years of age or older.
          By continuing, you confirm that you are at least 18 years old.
        </GateText>
        <GateButtons>
          <VerifyButton onClick={onVerify}>
            I am 18 or older
          </VerifyButton>
          <ExitButton to="/">
            Exit
          </ExitButton>
        </GateButtons>
      </GateCard>
    </GateContainer>
  );
}

import { Link } from "react-router-dom";

const GateContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: ${({ theme }) => theme.bg};
`;

const GateCard = styled.div`
  background: ${({ theme }) => theme.card};
  border-radius: 20px;
  padding: 40px 30px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  border: 1px solid ${({ theme }) => theme.border};
`;

const GateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 20px;
`;

const GateTitle = styled.h2`
  color: ${({ theme }) => theme.text};
  margin: 0 0 12px 0;
  font-size: 1.4rem;
`;

const GateText = styled.p`
  color: ${({ theme }) => theme.muted};
  margin: 0 0 24px 0;
  line-height: 1.6;
  font-size: 0.95rem;
`;

const GateButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const VerifyButton = styled.button`
  padding: 14px 24px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  
  &:active {
    opacity: 0.9;
  }
`;

const ExitButton = styled(Link)`
  padding: 14px 24px;
  background: transparent;
  color: ${({ theme }) => theme.muted};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  
  &:active {
    background: ${({ theme }) => theme.hoverDark};
  }
`;
