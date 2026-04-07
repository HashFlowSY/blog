import { describe, it, expect, vi } from "vitest";

// Mock dependencies BEFORE any imports
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getMessages: vi.fn().mockResolvedValue({}),
}));

vi.mock("next-intl", () => ({
  NextIntlClientProvider: ({
    children,
  }: {
    children: React.ReactNode;
    locale: string;
    messages: Record<string, unknown>;
  }) => children,
}));

vi.mock("@/components/layout/header", () => ({
  Header: () => createElement("header"),
}));

vi.mock("@/components/layout/footer", () => ({
  Footer: () => createElement("footer"),
}));

vi.mock("@/components/layout/skip-link", () => ({
  SkipLink: () => createElement("a", { href: "#main-content" }, "Skip"),
}));

vi.mock("@/lib/site", () => ({
  siteUrl: (path: string) => `https://example.com${path}`,
}));

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["zh-CN", "en-US"],
    defaultLocale: "zh-CN",
  },
}));

import { createElement } from "react";

import { og, tw } from "@/test-utils/metadata";

import { generateMetadata } from "./layout";

describe("LocaleLayout generateMetadata", () => {
  it("returns metadataBase", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect(metadata.metadataBase!.toString()).toBe("https://example.com/");
  });

  it("returns title template and default", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.title).toEqual({
      template: "%s | siteName",
      default: "siteName",
    });
  });

  it("returns description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.description).toBe("description");
  });

  it("returns alternates with canonical URL", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.alternates?.canonical).toBe("https://example.com/zh-CN/");
  });

  it("returns alternates.languages with zh-CN and en-US hreflang links", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.alternates?.languages).toEqual({
      "zh-CN": "https://example.com/zh-CN/",
      "en-US": "https://example.com/en-US/",
    });
  });

  it("returns openGraph type as website", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(og(metadata)?.type).toBe("website");
  });

  it("returns openGraph siteName", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.openGraph?.siteName).toBe("siteName");
  });

  it("returns openGraph locale", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en-US" }),
    });
    expect(metadata.openGraph?.locale).toBe("en_US");
  });

  it("returns twitter card as summary_large_image", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(tw(metadata)?.card).toBe("summary_large_image");
  });

  it("returns twitter site", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.twitter?.site).toBe("siteName");
  });

  it("uses correct locale in canonical for en-US", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en-US" }),
    });
    expect(metadata.alternates?.canonical).toBe("https://example.com/en-US/");
  });
});
