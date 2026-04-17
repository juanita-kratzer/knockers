// src/pages/shared/Login.jsx
// Unified login page for all users

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import { logger } from "../../lib/logger";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConfigured, user, loading: authLoading } = useAuth();
  const justSignedInRef = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || null;

  // Redirect when auth state has updated (avoids glitch: navigating before context updates)
  useEffect(() => {
    if (user && !authLoading) {
      navigate(from || "/", { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  // Sign out existing session only when landing on login with a user (not after we just signed in)
  useEffect(() => {
    if (!user || !isConfigured || justSignedInRef.current) return;
    const doSignOut = async () => {
      try {
        const { auth } = await import("../../firebase");
        const { signOut } = await import("firebase/auth");
        if (auth) await signOut(auth);
      } catch (e) {
        logger.error("Sign out error:", e);
      }
    };
    doSignOut();
  }, [user, isConfigured]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!isConfigured) {
      setError("App is running in demo mode. Firebase not configured.");
      setLoading(false);
      return;
    }

    try {
      const { auth } = await import("../../firebase");
      const { signInWithEmailAndPassword } = await import("firebase/auth");

      await signInWithEmailAndPassword(auth, email, password);
      justSignedInRef.current = true;
      // Don't navigate here — auth state will update, then the useEffect above will navigate
    } catch (err) {
      logger.error("Login error:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Check your connection and try again.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Email sign-in is not enabled for this app.");
      } else if (err.code === "auth/disabled") {
        setError("This account has been disabled.");
      } else if (err.message?.includes("permission") || err.code === "permission-denied") {
        setError("Signed in but could not load your profile. Please try again or contact support.");
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Content>
        <LogoSection>
          <Logo>Knockers</Logo>
          <Tagline>Book entertainers and event hire to your door</Tagline>
        </LogoSection>

        <Form onSubmit={handleSubmit} method="post" action="#">
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <InputGroup>
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </InputGroup>

          <ForgotPassword to="/forgot-password">Forgot password?</ForgotPassword>

          <SubmitButton type="submit" disabled={loading}>
            {loading ? <LoadingSpinner size={20} inline color="#1a1d21" /> : "Sign In"}
          </SubmitButton>
        </Form>

        <Divider>
          <DividerLine />
          <DividerText>or</DividerText>
          <DividerLine />
        </Divider>

        <SignupSection>
          <SignupPrompt>Don't have an account?</SignupPrompt>
          <SignupButton to="/signup">Sign Up</SignupButton>
        </SignupSection>
      </Content>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.bg};
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const Content = styled.div`
  padding: 40px 24px;
  max-width: 400px;
  margin: 0 auto;
  width: 100%;
`;

const LogoSection = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const Logo = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.primary};
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
`;

const Tagline = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.muted};
  margin: 0;
`;

const Form = styled.form``;

const ErrorMessage = styled.div`
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #ef4444;
  font-size: 0.9rem;
  margin-bottom: 20px;
  text-align: center;
`;

const InputGroup = styled.div`
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
  
  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
  
  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const ForgotPassword = styled(Link)`
  display: block;
  text-align: right;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.primary};
  margin-bottom: 24px;
  margin-top: -12px;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 16px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  border: none;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 32px 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: ${({ theme }) => theme.border};
`;

const DividerText = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const SignupSection = styled.div`
  text-align: center;
`;

const SignupPrompt = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.muted};
  margin: 0 0 16px 0;
`;

const SignupButton = styled(Link)`
  display: block;
  width: 100%;
  padding: 16px;
  background: transparent;
  color: ${({ theme }) => theme.primary};
  border: 2px solid ${({ theme }) => theme.primary};
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  text-align: center;
  
  &:active {
    background: rgba(135, 206, 235, 0.1);
  }
`;
