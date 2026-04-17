// src/pages/shared/Settings.jsx
// Comprehensive settings page for both clients and entertainers

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  ChevronRight,
  Theater,
  Bell,
  ShieldAlert,
  HelpCircle,
  FileText,
  Ban,
  LogOut,
  Wallet,
  Share2,
  DollarSign,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../context/RoleContext";
import { logger } from "../../lib/logger";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isEntertainer, hasEntertainerProfile, isAdmin } = useRole();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      logger.error("Logout error:", err);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Settings" showBack onBack={() => navigate("/profile")} />

      <Content>
        {/* Account Section (slimmed — Edit Profile, Verify Identity, Receipts, Saved, Booking History moved to Profile) */}
        <Section>
          <SectionTitle>Account</SectionTitle>
          <SettingsList>
            <SettingsItem to="/settings/notifications">
              <SettingsIcon>
                <Bell size={20} />
              </SettingsIcon>
              <SettingsLabel>
                <SettingsTitle>Notifications</SettingsTitle>
                <SettingsDescription>Manage push and email alerts</SettingsDescription>
              </SettingsLabel>
              <ChevronRight size={20} />
            </SettingsItem>

            {!hasEntertainerProfile && (
              <SettingsItem to="/talent/signup">
                <SettingsIcon>
                  <Theater size={20} />
                </SettingsIcon>
                <SettingsLabel>
                  <SettingsTitle>Join as Entertainer</SettingsTitle>
                  <SettingsDescription>Complete your entertainer profile to offer services or event hire</SettingsDescription>
                </SettingsLabel>
                <ChevronRight size={20} />
              </SettingsItem>
            )}

            <SettingsItem to={isEntertainer ? "/blocked/clients" : "/blocked/entertainers"}>
              <SettingsIcon>
                <Ban size={20} />
              </SettingsIcon>
              <SettingsLabel>
                <SettingsTitle>
                  {isEntertainer ? "Blocked Clients" : "Blocked Entertainers"}
                </SettingsTitle>
                <SettingsDescription>Manage blocked accounts</SettingsDescription>
              </SettingsLabel>
              <ChevronRight size={20} />
            </SettingsItem>
          </SettingsList>
        </Section>

        {/* Payments Section — entertainer only (Stripe handles client payments externally) */}
        {isEntertainer && (
          <Section>
            <SectionTitle>Payments</SectionTitle>
            <SettingsList>
              <SettingsItem to="/finances">
                <SettingsIcon>
                  <Wallet size={20} />
                </SettingsIcon>
                <SettingsLabel>
                  <SettingsTitle>Finances</SettingsTitle>
                  <SettingsDescription>Earnings and pending payouts</SettingsDescription>
                </SettingsLabel>
                <ChevronRight size={20} />
              </SettingsItem>

              <SettingsItem to="/settings/bank">
                <SettingsIcon>
                  <DollarSign size={20} />
                </SettingsIcon>
                <SettingsLabel>
                  <SettingsTitle>Bank Details</SettingsTitle>
                  <SettingsDescription>Update payout account</SettingsDescription>
                </SettingsLabel>
                <ChevronRight size={20} />
              </SettingsItem>
            </SettingsList>
          </Section>
        )}

        {/* Safety Section - Entertainers Only */}
        {isEntertainer && (
          <Section>
            <SectionTitle>Safety</SectionTitle>
            <SettingsList>
              <SettingsItem to="/settings/emergency-contact">
                <SettingsIcon $highlight>
                  <ShieldAlert size={20} />
                </SettingsIcon>
                <SettingsLabel>
                  <SettingsTitle>Emergency Contact</SettingsTitle>
                  <SettingsDescription>Set up safety alert recipient</SettingsDescription>
                </SettingsLabel>
                <ChevronRight size={20} />
              </SettingsItem>
            </SettingsList>
          </Section>
        )}

        {/* Sharing Section - Entertainers Only */}
        {isEntertainer && (
          <Section>
            <SectionTitle>Sharing</SectionTitle>
            <SettingsList>
              <SettingsItem to="/settings/share-profile">
                <SettingsIcon>
                  <Share2 size={20} />
                </SettingsIcon>
                <SettingsLabel>
                  <SettingsTitle>Your Profile Link</SettingsTitle>
                  <SettingsDescription>Share with clients</SettingsDescription>
                </SettingsLabel>
                <ChevronRight size={20} />
              </SettingsItem>

              <SettingsItem to="/settings/referral">
                <SettingsIcon>
                  <Share2 size={20} />
                </SettingsIcon>
                <SettingsLabel>
                  <SettingsTitle>Refer Entertainers</SettingsTitle>
                  <SettingsDescription>Invite others and earn</SettingsDescription>
                </SettingsLabel>
                <ChevronRight size={20} />
              </SettingsItem>
            </SettingsList>
          </Section>
        )}

        {/* Support Section */}
        <Section>
          <SectionTitle>Support</SectionTitle>
          <SettingsList>
            <SettingsItem to="/help">
              <SettingsIcon>
                <HelpCircle size={20} />
              </SettingsIcon>
              <SettingsLabel>
                <SettingsTitle>Help Centre</SettingsTitle>
                <SettingsDescription>FAQ, support & contact</SettingsDescription>
              </SettingsLabel>
              <ChevronRight size={20} />
            </SettingsItem>
          </SettingsList>
        </Section>

        {/* Admin Section (only for admins) */}
        {isAdmin && (
          <Section>
            <SectionTitle>Admin</SectionTitle>
            <SettingsList>
              <SettingsItem to="/admin/dashboard">
                <SettingsIcon>
                  <ShieldAlert size={20} />
                </SettingsIcon>
                <SettingsLabel>
                  <SettingsTitle>Admin Dashboard</SettingsTitle>
                  <SettingsDescription>Platform control and moderation</SettingsDescription>
                </SettingsLabel>
                <ChevronRight size={20} />
              </SettingsItem>
            </SettingsList>
          </Section>
        )}

        {/* Legal Section */}
        <Section>
          <SectionTitle>Legal</SectionTitle>
          <SettingsList>
            <SettingsItem to="/legal/terms">
              <SettingsIcon>
                <FileText size={20} />
              </SettingsIcon>
              <SettingsLabel>
                <SettingsTitle>Terms & Conditions</SettingsTitle>
              </SettingsLabel>
              <ChevronRight size={20} />
            </SettingsItem>

            <SettingsItem to="/legal/privacy">
              <SettingsIcon>
                <FileText size={20} />
              </SettingsIcon>
              <SettingsLabel>
                <SettingsTitle>Privacy Policy</SettingsTitle>
              </SettingsLabel>
              <ChevronRight size={20} />
            </SettingsItem>

            <SettingsItem to="/legal/contractor">
              <SettingsIcon>
                <FileText size={20} />
              </SettingsIcon>
              <SettingsLabel>
                <SettingsTitle>Contractor Agreement</SettingsTitle>
              </SettingsLabel>
              <ChevronRight size={20} />
            </SettingsItem>
          </SettingsList>
        </Section>

        {/* Logout */}
        <Section>
          <LogoutButton onClick={() => setShowLogoutConfirm(true)}>
            <LogOut size={20} />
            Log Out
          </LogoutButton>
        </Section>

        <VersionText>Knockers v1.0.0</VersionText>
      </Content>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <ModalOverlay onClick={() => setShowLogoutConfirm(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Log Out?</ModalTitle>
            <ModalText>Are you sure you want to log out of your account?</ModalText>
            <ModalButtons>
              <ModalCancel onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </ModalCancel>
              <ModalConfirm onClick={handleLogout}>Log Out</ModalConfirm>
            </ModalButtons>
          </Modal>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}

const Content = styled.div`
  padding: 0 16px 40px;
`;

const Section = styled.div`
  margin-bottom: 28px;
`;

const SectionTitle = styled.h2`
  font-size: 0.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.muted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 12px 4px;
`;

const SettingsList = styled.div`
  background: ${({ theme }) => theme.card};
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border};
`;

const SettingsItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  text-decoration: none;
  color: ${({ theme }) => theme.text};
  border-bottom: 1px solid ${({ theme }) => theme.border};
  transition: background 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: ${({ theme }) => theme.bgAlt};
  }

  svg:last-child {
    color: ${({ theme }) => theme.muted};
  }
`;

const SettingsIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $highlight, theme }) =>
    $highlight ? "rgba(239, 68, 68, 0.15)" : theme.bgAlt};
  color: ${({ $highlight, theme }) => ($highlight ? "#ef4444" : theme.primary)};
`;

const SettingsLabel = styled.div`
  flex: 1;
  min-width: 0;
`;

const SettingsTitle = styled.div`
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
`;

const SettingsDescription = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  margin-top: 2px;
`;

const LogoutButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 16px;
  color: #ef4444;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:active {
    background: rgba(239, 68, 68, 0.1);
  }
`;

const VersionText = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.muted};
  font-size: 0.8rem;
  margin-top: 20px;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.card};
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  text-align: center;
`;

const ModalTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const ModalText = styled.p`
  margin: 0 0 24px;
  color: ${({ theme }) => theme.muted};
  font-size: 0.95rem;
  line-height: 1.5;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
`;

const ModalCancel = styled.button`
  flex: 1;
  padding: 14px;
  background: ${({ theme }) => theme.bgAlt};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-weight: 600;
  cursor: pointer;
`;

const ModalConfirm = styled.button`
  flex: 1;
  padding: 14px;
  background: #ef4444;
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  cursor: pointer;
`;
