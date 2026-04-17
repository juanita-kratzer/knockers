// src/components/ScrollToTop.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop - Scrolls to top on route change
 * 
 * Place this component inside your Router to automatically
 * scroll to the top when navigating between pages.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll the main content area to top
    const mainContent = document.getElementById("main-content-area");
    if (mainContent) {
      mainContent.scrollTo(0, 0);
    }
    // Also scroll window for safety
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}







