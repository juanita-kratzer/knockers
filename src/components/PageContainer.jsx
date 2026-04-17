// src/components/PageContainer.jsx
// Shared page container for consistent spacing across the app
import styled from "styled-components";

/**
 * PageContainer - Consistent wrapper for all page content
 * 
 * Use this to wrap your page content for consistent padding/spacing.
 * Works inside the Layout component with bottom nav.
 * 
 * Props:
 * @param {boolean} noPadding - Skip the content padding (default: false)
 * @param {boolean} fullHeight - Use full viewport height (default: true)
 * @param {boolean} standalone - For pages outside Layout (SignIn, SignUp) - adds extra top padding
 */
export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: ${({ $fullHeight = true }) => $fullHeight ? '100%' : 'auto'};
  background: var(--bg-primary);
  
  /* Standalone pages (not in Layout) need their own safe area handling */
  ${({ $standalone }) => $standalone && `
    padding-top: calc(env(safe-area-inset-top, 20px) + 5rem);
    min-height: 100vh;
  `}
`;

/**
 * PageContent - Content area inside PageContainer
 * 
 * Use this for the main scrollable content of the page.
 */
export const PageContent = styled.div`
  flex: 1;
  padding: ${({ $noPadding }) => $noPadding ? '0' : '1rem'};
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

/**
 * PageTitle - Standalone title for pages without PageHeader
 * 
 * Use this when you need a centered title without a full header bar.
 */
export const PageTitle = styled.h1`
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
  text-align: ${({ $align }) => $align || 'center'};
`;

/**
 * PageSubtitle - Secondary text below title
 */
export const PageSubtitle = styled.p`
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin: 0 0 1.5rem 0;
  text-align: ${({ $align }) => $align || 'center'};
  
  a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 600;
  }
`;

export default PageContainer;







