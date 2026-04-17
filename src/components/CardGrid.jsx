import styled from "styled-components";

export const Grid = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  @media (max-width: 900px) {
    grid-template-columns: repeat(6, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const Card = styled.div`
  grid-column: span 6;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transition: all 180ms ease;
  }
`;

export const CardMedia = styled.div`
  aspect-ratio: 16/9;
  background: linear-gradient(135deg, ${({ theme }) => theme.primary}22, ${({ theme }) => theme.cardAlt});
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.muted};
  font-size: 14px;
  letter-spacing: 0.05em;
  font-weight: 500;
`;

export const CardBody = styled.div`
  padding: 20px;
  display: grid;
  gap: 12px;
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: ${({ theme }) => theme.text};
`;

export const CardText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.muted};
  line-height: 1.6;
`;

export const CardActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

export const Button = styled.a`
  display: inline-block;
  padding: 11px 18px;
  border-radius: 12px;
  border: 1px solid ${({ $primary, theme }) => ($primary ? "transparent" : theme.border)};
  background: ${({ $primary, theme }) => ($primary ? theme.primary : "transparent")};
  color: ${({ $primary }) => ($primary ? "#1a1d21" : "inherit")};
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  &:hover {
    background: ${({ $primary, theme }) => ($primary ? theme.primaryDark : theme.hoverDark)};
  }
`;
