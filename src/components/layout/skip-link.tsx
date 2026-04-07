"use client";

import { useCallback } from "react";

interface SkipLinkProps {
  /** Visible text of the skip link */
  label?: string;
  /** ID of the target element to skip to */
  targetId?: string;
}

/**
 * Accessible skip-to-content link.
 * Visually hidden by default, becomes visible on keyboard focus.
 */
export function SkipLink({
  label = "Skip to main content",
  targetId = "main-content",
}: SkipLinkProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.tabIndex = -1;
        target.focus();
        target.scrollIntoView({ behavior: "smooth" });
      }
    },
    [targetId],
  );

  return (
    <a
      data-testid="skip-link"
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      onClick={handleClick}
    >
      {label}
    </a>
  );
}
