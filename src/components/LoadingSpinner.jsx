// src/components/LoadingSpinner.jsx
import React from "react";
import styled, { keyframes } from "styled-components";

/**
 * A reusable spinning circle loader
 * @param {number} size - Size in pixels (default: 28)
 * @param {boolean} fullPage - If true, centers in full viewport
 * @param {boolean} inline - If true, displays inline without wrapper
 * @param {string} color - Custom color (default: uses theme primary)
 */
export default function LoadingSpinner({ size = 28, fullPage = false, inline = false, color }) {
  if (fullPage) {
    return (
      <FullPageWrapper>
        <Spinner $size={size} $color={color} />
      </FullPageWrapper>
    );
  }

  if (inline) {
    return <InlineSpinner $size={size} $color={color} />;
  }

  return (
    <Wrapper>
      <Spinner $size={size} $color={color} />
    </Wrapper>
  );
}

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const FullPageWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  background: var(--bg-primary, #1a1d21);
`;

const Spinner = styled.div`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: ${({ $color }) => $color || 'var(--primary)'};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
`;

// Inline spinner for buttons - white on colored backgrounds
const InlineSpinner = styled.div`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  display: inline-block;
  vertical-align: middle;
`;
