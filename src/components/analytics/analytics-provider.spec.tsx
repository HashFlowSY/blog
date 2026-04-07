import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { AnalyticsProvider } from "./analytics-provider";

describe("AnalyticsProvider", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("does not add any script when no config is provided", () => {
    render(<AnalyticsProvider />);
    expect(document.head.querySelectorAll("script")).toHaveLength(0);
  });

  it("adds Plausible script when plausibleDomain is set", () => {
    render(<AnalyticsProvider plausibleDomain="example.com" />);

    // React needs to flush the effect
    const script = document.head.querySelector("script");
    expect(script).toBeInTheDocument();
    expect(script?.getAttribute("data-domain")).toBe("example.com");
    expect(script?.src).toContain("plausible.io");
  });

  it("adds Umami script when umamiWebsiteId is set", () => {
    render(<AnalyticsProvider umamiWebsiteId="abc123" />);

    const script = document.head.querySelector("script");
    expect(script).toBeInTheDocument();
    expect(script?.getAttribute("data-website-id")).toBe("abc123");
    expect(script?.src).toContain("umami.is");
  });

  it("uses custom Plausible src when provided", () => {
    render(
      <AnalyticsProvider
        plausibleDomain="example.com"
        plausibleSrc="https://custom.plausible.io/script.js"
      />,
    );

    const script = document.head.querySelector("script");
    expect(script?.src).toBe("https://custom.plausible.io/script.js");
  });

  it("prefers Plausible over Umami when both are set", () => {
    render(
      <AnalyticsProvider
        plausibleDomain="example.com"
        umamiWebsiteId="abc123"
      />,
    );

    const scripts = document.head.querySelectorAll("script");
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.getAttribute("data-domain")).toBe("example.com");
  });

  it("removes script on unmount", () => {
    const { unmount } = render(
      <AnalyticsProvider plausibleDomain="example.com" />,
    );

    expect(document.head.querySelector("script")).toBeInTheDocument();
    unmount();
    expect(document.head.querySelector("script")).not.toBeInTheDocument();
  });
});
