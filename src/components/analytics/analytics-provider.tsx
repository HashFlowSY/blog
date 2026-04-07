"use client";

import { useEffect } from "react";

interface AnalyticsConfig {
  /** Plausible: set to your Plausible domain (e.g. "example.com") */
  plausibleDomain?: string;
  /** Plausible: custom script src (defaults to official CDN) */
  plausibleSrc?: string;
  /** Umami: set to your Umami website ID */
  umamiWebsiteId?: string;
  /** Umami: custom script src (defaults to official CDN) */
  umamiSrc?: string;
}

/**
 * Privacy-first analytics provider.
 * Supports Plausible and Umami — both are cookie-free.
 * Enable by setting NEXT_PUBLIC_PLAUSIBLE_DOMAIN or NEXT_PUBLIC_UMAMI_ID env vars.
 */
export function AnalyticsProvider({
  plausibleDomain,
  plausibleSrc = "https://plausible.io/js/script.js",
  umamiWebsiteId,
  umamiSrc = "https://analytics.umami.is/script.js",
}: AnalyticsConfig) {
  useEffect(() => {
    if (plausibleDomain) {
      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.setAttribute("data-domain", plausibleDomain);
      script.src = plausibleSrc;
      document.head.appendChild(script);
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }

    if (umamiWebsiteId) {
      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.setAttribute("data-website-id", umamiWebsiteId);
      script.src = umamiSrc;
      document.head.appendChild(script);
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [plausibleDomain, plausibleSrc, umamiWebsiteId, umamiSrc]);

  return null;
}
