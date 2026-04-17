// src/pages/shared/ChangePassword.jsx
// Change password (AMBTN-style: current password, new, confirm)

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "../../firebase";
import LoadingSpinner from "../../components/LoadingSpinner";
import { logger } from "../../lib/logger";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const canChangePassword = useMemo(() => {
    const providers = user?.providerData?.map((p) => p.providerId) || [];
    return providers.includes("password");
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "Please fill in all fields." });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setMessage({ type: "success", text: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => navigate("/settings"), 2000);
    } catch (err) {
      logger.error("Change password error:", err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setMessage({ type: "error", text: "Current password is incorrect." });
      } else {
        setMessage({ type: "error", text: err.message || "Failed to update password." });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Container>
        <PageHeader title="Change Password" onBack={() => navigate("/settings")} />
        <Message>Sign in to change your password.</Message>
      </Container>
    );
  }

  if (!canChangePassword) {
    return (
      <Container>
        <PageHeader title="Change Password" onBack={() => navigate("/settings")} />
        <Message $muted>
          You signed in with a social account. Password change is only available for email/password sign-in.
        </Message>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader title="Change Password" onBack={() => navigate("/settings")} />

      <Form onSubmit={handleSubmit}>
        {message.text && (
          <Alert $type={message.type}>{message.text}</Alert>
        )}

        <Field>
          <Label>Current password</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            autoComplete="current-password"
          />
        </Field>

        <Field>
          <Label>New password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
        </Field>

        <Field>
          <Label>Confirm new password</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            autoComplete="new-password"
          />
        </Field>

        <SubmitButton type="submit" disabled={saving}>
          {saving ? <LoadingSpinner size={20} inline color="#1a1d21" /> : "Update password"}
        </SubmitButton>
      </Form>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100%;
  background: ${({ theme }) => theme.bg};
  padding-bottom: 40px;
`;

const Message = styled.p`
  padding: 24px 16px;
  color: ${({ theme, $muted }) => ($muted ? theme.muted : theme.text)};
  text-align: center;
  font-size: 0.95rem;
`;

const Form = styled.form`
  padding: 24px 16px;
`;

const Alert = styled.div`
  padding: 12px 16px;
  margin-bottom: 20px;
  border-radius: 10px;
  font-size: 0.9rem;
  background: ${({ $type }) =>
    $type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.1)"};
  color: ${({ $type }) => ($type === "success" ? "#22c55e" : "#ef4444")};
  border: 1px solid
    ${({ $type }) =>
      $type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"};
`;

const Field = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 16px;
  margin-top: 8px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
