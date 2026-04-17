import { Link } from "react-router-dom";
import styled from "styled-components";

const Wrap = styled.footer`
  border-top: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.bgDark};
`;

const Inner = styled.div`
  max-width: ${({ theme }) => theme.maxw};
  margin: 0 auto;
  padding: 28px 20px;
  color: ${({ theme }) => theme.muted};
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`;

const Links = styled.div`
  display: flex;
  gap: 16px;
  a:hover {
    color: ${({ theme }) => theme.text};
  }
`;

export default function Footer() {
  return (
    <Wrap>
      <Inner>
        <div>© {new Date().getFullYear()} Knockers PTY LTD</div>
        <Links>
          <Link to="/legal/terms">Terms</Link>
          <Link to="/legal/privacy">Privacy</Link>
          <Link to="/help">Safety</Link>
        </Links>
      </Inner>
    </Wrap>
  );
}
