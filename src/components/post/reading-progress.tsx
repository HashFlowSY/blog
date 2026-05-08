"use client";

import { useEffect, useRef } from "react";

export function ReadingProgress() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    function syncProgress() {
      const scrollableHeight = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const progress = Math.min(
        1,
        Math.max(0, window.scrollY / scrollableHeight),
      );
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }
      ticking = false;
    }

    function requestProgressSync() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(syncProgress);
    }

    syncProgress();
    window.addEventListener("scroll", requestProgressSync, { passive: true });
    window.addEventListener("resize", requestProgressSync);

    return () => {
      window.removeEventListener("scroll", requestProgressSync);
      window.removeEventListener("resize", requestProgressSync);
    };
  }, []);

  return <div className="read-progress" aria-hidden="true" ref={progressRef} />;
}
