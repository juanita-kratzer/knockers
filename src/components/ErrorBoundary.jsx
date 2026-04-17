// src/components/ErrorBoundary.jsx
import React from "react";
import styled from "styled-components";
import { logger } from "../lib/logger";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorCard>
            <ErrorIcon>!</ErrorIcon>
            <ErrorTitle>Something went wrong</ErrorTitle>
            <ErrorMessage>
              {this.state.error?.message || "An unexpected error occurred."}
            </ErrorMessage>
            <ReloadButton onClick={this.handleReload}>
              Reload App
            </ReloadButton>
          </ErrorCard>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background: var(--bg-primary);
`;

const ErrorCard = styled.div`
  background: var(--bg-card);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  max-width: 400px;
  width: 100%;
  border: 1px solid var(--border-color);
`;

const ErrorIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--danger-bg);
  color: var(--danger-text);
  font-size: 2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
`;

const ErrorTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
`;

const ErrorMessage = styled.p`
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin: 0 0 1.5rem;
  line-height: 1.5;
`;

const ReloadButton = styled.button`
  background: var(--primary);
  color: #1a1d21;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;







