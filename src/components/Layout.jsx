// src/components/Layout.jsx
import { Outlet, useLocation, Navigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { isAppleReviewAccount } from "../lib/appleReview";
import { isIdentityVerified } from "../lib/identityVerification";
import BottomNav from "./BottomNav";
import BannedPage from "../pages/shared/BannedPage";

// Pages that should have the full-screen layout (e.g., map pages with no header)
const fullScreenPages = ["/"];

// Pages that should hide the bottom navigation
const noNavPages = [
  "/login",
  "/signup",
  "/client/login",
  "/client/signup",
  "/talent/login",
  "/talent/signup",
  "/admin",
];

export default function Layout() {
  const { pathname } = useLocation();
  const { user, userData } = useAuth();
  const { isAdmin } = useRole();
  const isFullScreen = fullScreenPages.includes(pathname);
  const hideNav = pathname.startsWith("/admin") || noNavPages.some(page => pathname.startsWith(page));
  const isBanned = user && userData?.isBanned === true && !isAdmin && !isAppleReviewAccount(user);

  const allowedWithoutIdentity =
    pathname === "/profile/verification" ||
    pathname === "/verify-identity" ||
    pathname === "/login" || pathname === "/signup" ||
    pathname.startsWith("/client/login") || pathname.startsWith("/client/signup") ||
    pathname.startsWith("/talent/login") || pathname.startsWith("/talent/signup") ||
    pathname.startsWith("/admin") ||
    pathname === "/settings" || pathname.startsWith("/settings/") ||
    pathname === "/profile" || pathname === "/profile/edit" ||
    pathname === "/about" || pathname === "/contact" ||
    pathname === "/help" || pathname === "/faq" ||
    pathname.startsWith("/legal/") ||
    pathname === "/terms" || pathname === "/privacy";
  const mustVerifyIdentity = user && userData && !allowedWithoutIdentity && !isIdentityVerified(userData, user);

  return (
    <Frame>
      <TopSpacer $fullScreen={isFullScreen} />
      <ContentArea id="main-content-area" $fullScreen={isFullScreen} $hideNav={hideNav}>
        {isBanned ? <BannedPage /> : mustVerifyIdentity ? <Navigate to="/profile/verification" replace /> : <Outlet />}
      </ContentArea>

      {/* Fixed bottom navigation with safe area padding */}
      {!hideNav && (
        <BottomBar>
          <BottomNav />
        </BottomBar>
      )}
    </Frame>
  );
}

/* ===== Styled Components ===== */
const Frame = styled.div`
  height: 100%;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-primary);
  color: var(--text-primary);
`;

/* Pushes content below the notch/safe area (map page gets it too so header clears status bar) */
const TopSpacer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--safe-top);
  background: var(--bg-primary);
  z-index: 1;
  pointer-events: none;
`;

/* Main viewport: never scrolls under header or bottom nav */
const ContentArea = styled.main`
  position: fixed;
  top: var(--safe-top);
  bottom: ${({ $hideNav }) => $hideNav ? 'var(--safe-bottom)' : 'var(--bottomnav-total)'};
  left: 0;
  right: 0;
  overflow-x: hidden;
  overflow-y: ${({ $fullScreen }) => $fullScreen ? 'hidden' : 'auto'};
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  background: var(--bg-primary);
  z-index: 10;
  touch-action: pan-y;
`;

/* Bottom nav sits above the home indicator; extra padding so icons aren't too low on iPhone */
const BottomBar = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--bottomnav-total);
  padding-bottom: calc(var(--safe-bottom) + var(--bottomnav-extra-bottom));
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;
