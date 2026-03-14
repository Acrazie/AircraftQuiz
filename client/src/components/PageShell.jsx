import React from "react";

/**
 * Standard outer wrapper for content pages (Quizzes, Ranking, Profile).
 * Provides consistent padding, gap, and scroll behaviour.
 * @param {{ children: React.ReactNode, className?: string }} props
 */
const PageShell = ({ children, className = "" }) => (
  <div
    className={`flex-1 h-full flex flex-col gap-8 p-6 md:p-10 overflow-y-auto ${className}`.trim()}
  >
    {children}
  </div>
);

export default PageShell;
