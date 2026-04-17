// src/pages/shared/NotificationsPage.jsx
// Notification preferences — UI toggles saved to Firestore (no backend delivery yet)

import { useState, useEffect } from "react";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { COL } from "../../lib/collections";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import { logger } from "../../lib/logger";

const CATEGORIES = [
  { key: "bookings", label: "Bookings", desc: "New requests, accepted, cancelled, completed" },
  { key: "messages", label: "Messages", desc: "New messages from bookings" },
  { key: "payments", label: "Payments", desc: "Deposit confirmed, payout sent" },
  { key: "verification", label: "Verification", desc: "Identity and badge status updates" },
  { key: "marketing", label: "Promotions", desc: "News, offers and product updates" },
];

const DEFAULT_PREFS = { bookings: true, messages: true, payments: true, verification: true, marketing: false };

export default function NotificationsPage() {
  const { user, userData } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData?.notificationPreferences) {
      setPrefs((prev) => ({ ...prev, ...userData.notificationPreferences }));
    } else if (userData) {
      setPrefs((prev) => ({ ...prev, marketing: userData.marketingOptIn === true }));
    }
  }, [userData]);

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    if (!user) return;
    setSaving(true);
    try {
      const userRef = doc(db, COL.users, user.uid);
      await updateDoc(userRef, { notificationPreferences: next });
    } catch (e) {
      logger.error("Save notification prefs failed:", e);
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Notifications" showBack />
      <Content>
        <Hint>Choose which notifications you'd like to receive.</Hint>
        <List>
          {CATEGORIES.map(({ key, label, desc }) => (
            <Row key={key}>
              <RowLabel>
                <RowTitle>{label}</RowTitle>
                <RowDesc>{desc}</RowDesc>
              </RowLabel>
              <Toggle
                type="checkbox"
                checked={!!prefs[key]}
                onChange={() => toggle(key)}
                disabled={saving}
              />
            </Row>
          ))}
        </List>
        <Footer>Notification delivery (push & email) coming soon.</Footer>
      </Content>
    </PageContainer>
  );
}

const Content = styled.div`padding: 16px;`;
const Hint = styled.p`margin: 0 0 20px; font-size: 0.9rem; color: ${({ theme }) => theme.muted}; line-height: 1.5;`;

const List = styled.div`
  background: ${({ theme }) => theme.card}; border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px; overflow: hidden;
`;
const Row = styled.div`
  display: flex; align-items: center; justify-content: space-between; padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  &:last-child { border-bottom: none; }
`;
const RowLabel = styled.div`flex: 1; min-width: 0;`;
const RowTitle = styled.div`font-weight: 600; font-size: 0.95rem; color: ${({ theme }) => theme.text};`;
const RowDesc = styled.div`font-size: 0.8rem; color: ${({ theme }) => theme.muted}; margin-top: 2px;`;

const Toggle = styled.input`
  width: 44px; height: 24px; appearance: none; background: ${({ theme }) => theme.bgAlt};
  border-radius: 12px; position: relative; cursor: pointer; flex-shrink: 0;
  &:checked { background: ${({ theme }) => theme.primary}; }
  &::after {
    content: ""; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;
    background: white; border-radius: 50%; transition: transform 0.2s ease;
  }
  &:checked::after { transform: translateX(20px); }
  &:disabled { opacity: 0.6; }
`;

const Footer = styled.p`margin-top: 20px; font-size: 0.82rem; color: ${({ theme }) => theme.muted}; text-align: center;`;
