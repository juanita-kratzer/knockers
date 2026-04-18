// src/components/PageHeader.jsx
// Shared page header component for consistent navigation
import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

/**
 * PageHeader - Consistent header for all pages
 * 
 * @param {string} title - The page title
 * @param {React.ReactNode} rightContent - Optional content for right side
 * @param {boolean} showBack - Whether to show back button (default: true)
 * @param {function} onBack - Custom back handler (defaults to navigate(-1))
 * @param {React.ReactNode} children - Additional content below the header bar
 */
export default function PageHeader({ 
  title, 
  rightContent, 
  showBack = true, 
  onBack,
  children 
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <HeaderContainer>
      <HeaderBar>
        {showBack ? (
          <BackButton onClick={handleBack}>
            Back
          </BackButton>
        ) : (
          <Spacer />
        )}
        <Title>{title}</Title>
        {rightContent ? rightContent : <Spacer />}
      </HeaderBar>
      {children}
    </HeaderContainer>
  );
}

const HeaderContainer = styled.div`
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg-card);
  margin-bottom: 16px;
`;

const HeaderBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 1.1rem;
  border: 1px solid var(--primary);
  border-radius: 50px;
  background: transparent;
  color: var(--primary);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
  min-width: 72px;
  
  &:hover {
    background: rgba(135, 206, 235, 0.1);
  }
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
  text-align: center;
`;

const Spacer = styled.div`
  width: 72px;
`;







