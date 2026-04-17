// Phase 5: In-app promotion banner (Home, Dashboard, profile)

import styled from "styled-components";
import { usePromotions } from "../hooks/usePromotions";

export default function PromoBanner({ targetRole = "both", className, style }) {
  const { promotions, loading } = usePromotions(targetRole);

  if (loading || promotions.length === 0) return null;

  return (
    <div className={className} style={style}>
      {promotions.map((p) => (
        <Banner key={p.id}>
          {p.bannerText || p.title}
        </Banner>
      ))}
    </div>
  );
}

const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(135, 206, 235, 0.15) 0%, rgba(135, 206, 235, 0.05) 100%);
  border: 1px solid rgba(135, 206, 235, 0.3);
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  font-size: 0.9rem;
  margin-bottom: 12px;
  &:last-child { margin-bottom: 0; }
`;
