// src/GlobalStyle.js
import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  /* Universal vertical scroll enablement */
  .page-container,
  [class*="Container"],
  [class*="Page"],
  main,
  article,
  section {
    overflow-y: auto !important;
    overflow-x: hidden !important;
    -webkit-overflow-scrolling: touch !important;
  }

  /* Ensure scrolling works on all touch devices */
  * {
    touch-action: pan-x pan-y;
  }

  /* Use theme for focus/selected states */
  input:focus,
  select:focus,
  textarea:focus,
  button:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => `${theme.primary}22`};
  }

  /* Global input styling for dark mode */
  input, select, textarea {
    background: var(--bg-input);
    color: var(--text-primary);
    border-color: var(--border-input);
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--text-placeholder);
  }

  /* Global select styling */
  select {
    font-family: inherit;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 10px;
    padding-right: 2.5rem;
  }

  /* Native <select> popup selection color */
  select option:checked {
    background: ${({ theme }) => theme.primary};
    color: #fff;
  }

  /* Scrollbar styling for dark mode */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: var(--bg-primary);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }
`;

export default GlobalStyle;
