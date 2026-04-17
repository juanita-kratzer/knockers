// src/pages/client/Login.jsx
// Client login page – ensures user doc exists in Firestore with role: client

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { COL } from "../../lib/collections";
import { useRole, ROLES } from "../../context/RoleContext";
import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import { logger } from "../../lib/logger";

export default function ClientLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setRole } = useRole();
  const { refetchUserData } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from || "/client";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      const userRef = doc(db, COL.users, loggedInUser.uid);
      const snap = await getDoc(userRef);

      const existing = snap.exists() ? snap.data() : {};
      const userPayload = {
        uid: loggedInUser.uid,
        email: loggedInUser.email || "",
        name: loggedInUser.displayName || "",
        phone: loggedInUser.phoneNumber || "",
        photoURL: loggedInUser.photoURL || "",
        role: ROLES.CLIENT,
        hasEntertainerProfile: existing.hasEntertainerProfile ?? false,
        updatedAt: serverTimestamp(),
      };

      if (!snap.exists()) {
        await setDoc(userRef, { ...userPayload, createdAt: serverTimestamp() }, { merge: true });
      } else {
        await setDoc(userRef, userPayload, { merge: true });
      }

      await setRole(ROLES.CLIENT);
      await refetchUserData();

      const entertainerRef = doc(db, COL.entertainers, loggedInUser.uid);
      const entSnap = await getDoc(entertainerRef);
      if (entSnap.exists()) {
        navigate("/choose-dashboard", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      logger.error("Login error:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else {
        setError("Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <BackButton to="/">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </BackButton>
      </Header>

      <Content>
        <Icon>Hi</Icon>
        <Title>Welcome Back</Title>
        <Subtitle>Sign in to book entertainers and event hire</Subtitle>

        <Form onSubmit={handleSubmit}>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <InputGroup>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </InputGroup>

          <InputGroup>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </InputGroup>

          <SubmitButton type="submit" disabled={loading}>
            {loading ? <LoadingSpinner size={20} inline color="#1a1d21" /> : "Sign In"}
          </SubmitButton>
        </Form>

        <Divider>
          <DividerLine />
          <DividerText>or</DividerText>
          <DividerLine />
        </Divider>

        <SignupPrompt>
          Don't have an account?{" "}
          <SignupLink to="/client/signup">Create one</SignupLink>
        </SignupPrompt>

        <EntertainerPrompt>
          Are you an entertainer?{" "}
          <EntertainerLink to="/talent/login">Entertainer login</EntertainerLink>
        </EntertainerPrompt>
      </Content>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.bg};
`;

const Header = styled.header`
  padding: 16px;
`;

const BackButton = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  
  &:active {
    background: ${({ theme }) => theme.hoverDark};
  }
`;

const Content = styled.div`
  padding: 20px 24px 40px;
  max-width: 400px;
  margin: 0 auto;
`;

const Icon = styled.div`
  font-size: 48px;
  text-align: center;
  margin-bottom: 16px;
`;

const Title = styled.h1`
  margin: 0 0 8px 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  text-align: center;
`;

const Subtitle = styled.p`
  margin: 0 0 32px 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.muted};
  text-align: center;
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
  margin-top: 8px;
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
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

const SignupPrompt = styled.p`
  text-align: center;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.muted};
  margin: 0 0 16px 0;
`;

const SignupLink = styled(Link)`
  color: ${({ theme }) => theme.primary};
  font-weight: 600;
`;

const EntertainerPrompt = styled.p`
  text-align: center;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
  margin: 0;
`;

const EntertainerLink = styled(Link)`
  color: ${({ theme }) => theme.text};
  font-weight: 500;
`;
