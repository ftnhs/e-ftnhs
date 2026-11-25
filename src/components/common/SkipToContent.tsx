import React from "react";

/**
 * Semantic Skip to Main Content Link for Keyboard and Screen Reader Accessibility (WCAG 2.2 AA)
 */
export const SkipToContent: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-deped-blue-600 focus:text-white focus:font-semibold focus:rounded-md focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-deped-gold-400"
    >
      Skip to main content
    </a>
  );
};
