// src/pages/shared/FAQ.jsx
// Standalone FAQ page — redirects to /help but kept for anchor links

import { Navigate } from "react-router-dom";

export default function FAQ() {
  return <Navigate to="/help" replace />;
}
