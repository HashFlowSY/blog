"use client";

import { useEffect } from "react";

export function ScrollState() {
  useEffect(() => {
    function updateScrollState() {
      const scrolled = String(window.scrollY > 96);
      if (document.body.dataset["scrolled"] !== scrolled)
        document.body.dataset["scrolled"] = scrolled;
    }
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  return null;
}
