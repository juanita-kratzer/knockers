// Reusable verification fee modal — shown when user attempts a paid action without paying
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function VerificationModal({ show, onDismiss }) {
  const navigate = useNavigate();

  if (!show) return null;

  return (
    <Overlay onClick={onDismiss}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <IconWrap><ShieldCheck size={40} /></IconWrap>
        <Title>Verification Required</Title>
        <Text>
          Pay the $2 verification fee to unlock messaging, bookings, and listings.
        </Text>
        <PayButton onClick={() => { onDismiss(); navigate("/settings/verification"); }}>
          Pay Verification Fee
        </PayButton>
        <DismissButton onClick={onDismiss}>Not Now</DismissButton>
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
const PayButton = styled.button`
  width: 100%; padding: 14px; background: ${({ theme }) => theme.primary};
  border: none; border-radius: 12px; color: #1a1d21;
  font-size: 1rem; font-weight: 700; cursor: pointer; margin-bottom: 12px;
`;
const DismissButton = styled.button`
  width: 100%; padding: 14px; background: transparent;
  border: 1px solid ${({ theme }) => theme.border}; border-radius: 12px;
  color: ${({ theme }) => theme.muted}; font-size: 0.95rem; font-weight: 600; cursor: pointer;
`;
