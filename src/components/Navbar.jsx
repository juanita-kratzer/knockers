import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";

const Bar = styled.header`
  border-bottom: 1px solid ${({ theme }) => theme.border};
  background: rgba(26, 29, 33, 0.85);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const Inner = styled.div`
  max-width: ${({ theme }) => theme.maxw};
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Logo = styled(Link)`
  font-weight: 800;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.text};
  span {
    color: ${({ theme }) => theme.primary};
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 8px;
  align-items: center;
  a {
    padding: 8px 14px;
    border-radius: 10px;
    color: ${({ theme }) => theme.text};
    font-weight: 500;
  }
  a:hover {
    background: ${({ theme }) => theme.hoverDark};
  }
`;

const CTA = styled(Link)`
  padding: 10px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.primary};
  color: #1a1d21;
  font-weight: 700;
  &:hover {
    background: ${({ theme }) => theme.primaryDark};
  }
`;

export default function Navbar() {
  const { pathname } = useLocation();
  return (
    <Bar>
      <Inner>
        <Logo to="/">
          <span>Knockers</span> • entertainment on demand
        </Logo>
        <Nav>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          {pathname.startsWith("/talent") ? (
            <CTA to="/talent/signup">Join as Talent</CTA>
          ) : pathname.startsWith("/client") ? (
            <CTA to="/client/signup">Sign up</CTA>
          ) : (
            <>
              <Link to="/talent/login">Talent Login</Link>
              <Link to="/client/login">Client Login</Link>
              <CTA to="/">Find Entertainment</CTA>
            </>
          )}
        </Nav>
      </Inner>
    </Bar>
  );
}
