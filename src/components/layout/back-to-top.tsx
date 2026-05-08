"use client";

import { useEffect, useState } from "react";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    function syncVisibility() {
      const compact =
        window.matchMedia?.("(max-width: 640px)").matches ?? false;
      setIsVisible(window.scrollY > (compact ? 72 : 96));
      ticking = false;
    }

    function requestSync() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(syncVisibility);
    }

    syncVisibility();
    window.addEventListener("scroll", requestSync, { passive: true });
    return () => window.removeEventListener("scroll", requestSync);
  }, []);

  return (
    <button
      className="back-to-top"
      type="button"
      aria-label="回到顶部"
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      TOP
    </button>
  );
}
