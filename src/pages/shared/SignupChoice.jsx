// src/pages/shared/SignupChoice.jsx
// Signup choice page - User or Entertainer

import { Link, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { User, Star, ChevronRight } from "lucide-react";

export default function SignupChoice() {
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  const clientSignupTo = query ? `/client/signup?${query}` : "/client/signup";
  const talentSignupTo = query ? `/talent/signup?${query}` : "/talent/signup";

  return (
    <Container>
      <Header>
        <BackButton to="/login">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </BackButton>
      </Header>

      <Content>
        <Title>Join Knockers</Title>
        <Subtitle>How would you like to use the app?</Subtitle>

        <OptionsContainer>
          {/* User/Client option - More prominent */}
          <PrimaryOption to={clientSignupTo}>
            <OptionIconWrap $primary>
              <User size={32} />
            </OptionIconWrap>
            <OptionContent>
              <OptionTitle>I want to book entertainers</OptionTitle>
              <OptionDescription>
                Browse and book amazing entertainers for your events
              </OptionDescription>
            </OptionContent>
            <ChevronRight size={24} />
          </PrimaryOption>

          <OrDivider>
            <OrLine />
            <OrText>or</OrText>
            <OrLine />
          </OrDivider>

          {/* Entertainer option */}
          <SecondaryOption to={talentSignupTo}>
            <OptionIconWrap>
              <Star size={28} />
            </OptionIconWrap>
            <OptionContent>
              <OptionTitle>I'm an entertainer</OptionTitle>
              <OptionDescription>
                Create a profile and get booked for gigs
              </OptionDescription>
            </OptionContent>
            <ChevronRight size={24} />
          </SecondaryOption>
        </OptionsContainer>

        <Footer>
          <FooterText>
            Already have an account?{" "}
            <LoginLink to="/login">Sign in</LoginLink>
          </FooterText>
        </Footer>
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
  max-width: 440px;
  margin: 0 auto;
`;

const Title = styled.h1`
  margin: 0 0 8px 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  text-align: center;
`;

const Subtitle = styled.p`
  margin: 0 0 40px 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.muted};
  text-align: center;
`;

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const BaseOption = styled(Link)`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  
  &:active {
    transform: scale(0.98);
  }
`;

const PrimaryOption = styled(BaseOption)`
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  box-shadow: 0 4px 20px rgba(135, 206, 235, 0.3);
  
  svg {
    color: #1a1d21;
  }
`;

const SecondaryOption = styled(BaseOption)`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text};
  
  svg {
    color: ${({ theme }) => theme.muted};
  }
  
  &:last-child svg:last-child {
    color: ${({ theme }) => theme.muted};
  }
`;

const OptionIconWrap = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $primary, theme }) => $primary ? 'rgba(26, 29, 33, 0.15)' : theme.bg};
  flex-shrink: 0;
`;

const OptionContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const OptionTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 1.05rem;
  font-weight: 700;
`;

const OptionDescription = styled.p`
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.8;
  line-height: 1.4;
`;

const OrDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 8px 0;
`;

const OrLine = styled.div`
  flex: 1;
  height: 1px;
  background: ${({ theme }) => theme.border};
`;

const OrText = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;

const Footer = styled.div`
  margin-top: 40px;
  text-align: center;
`;

const FooterText = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.muted};
  margin: 0;
`;

const LoginLink = styled(Link)`
  color: ${({ theme }) => theme.primary};
  font-weight: 600;
`;
