import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

const SESSION_KEY = "policeCheckPromptDismissed";

export function shouldShowPoliceCheckPrompt(userData) {
  if (sessionStorage.getItem(SESSION_KEY)) return false;
  return userData?.policeCheck?.status !== "approved";
}

export default function PoliceCheckPrompt({ show, onDismiss }) {
  const navigate = useNavigate();

  if (!show) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    onDismiss();
  };

  return (
    <Overlay onClick={handleDismiss}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <IconWrap><ShieldCheck size={40} /></IconWrap>
        <Title>Get More Bookings</Title>
        <Text>
          Clients are more likely to book entertainers who are police check
          verified. Complete a police check to earn a verified badge on your
          profile.
        </Text>
        <PrimaryButton onClick={() => { handleDismiss(); navigate("/profile/verification"); }}>
          Get Verified
        </PrimaryButton>
        <DismissButton onClick={handleDismiss}>Remind Me Later</DismissButton>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.8);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
`;
const Modal = styled.div`
  background: ${({ theme }) => theme.card}; border-radius: 20px;
  padding: 32px 24px; width: 100%; max-width: 320px; text-align: center;
`;
const IconWrap = styled.div`
  color: ${({ theme }) => theme.primary}; margin-bottom: 16px;
`;
const Title = styled.h3`
  margin: 0 0 12px; font-size: 1.25rem; font-weight: 700;
  color: ${({ theme }) => theme.text};
`;
const Text = styled.p`
  margin: 0 0 24px; color: ${({ theme }) => theme.muted};
  font-size: 0.95rem; line-height: 1.5;
`;
const PrimaryButton = styled.button`
  width: 100%; padding: 14px; background: ${({ theme }) => theme.primary};
  border: none; border-radius: 12px; color: #1a1d21;
  font-size: 1rem; font-weight: 700; cursor: pointer; margin-bottom: 12px;
`;
const DismissButton = styled.button`
  width: 100%; padding: 14px; background: transparent;
  border: 1px solid ${({ theme }) => theme.border}; border-radius: 12px;
  color: ${({ theme }) => theme.muted}; font-size: 0.95rem; font-weight: 600; cursor: pointer;
`;
