// Mock next-intl and its server sub-module
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "zh-CN",
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

// Mock @/i18n/navigation to prevent next-intl's internal next/navigation resolution
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("@/lib/site", () => ({
  siteUrl: (path: string) => `https://example.com${path}`,
}));

import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect, vi } from "vitest";

import { og, tw } from "@/test-utils/metadata";

import AboutPage, { generateMetadata } from "./about/page";

describe("AboutPage", () => {
  it("renders page title", async () => {
    const html = await renderAbout();
    expect(html.textContent).toContain("title");
  });

  it("renders subtitle", async () => {
    const html = await renderAbout();
    expect(html.textContent).toContain("subtitle");
  });

  it("renders skills section", async () => {
    const html = await renderAbout();
    expect(html.textContent).toContain("skills");
  });

  it("renders experience section", async () => {
    const html = await renderAbout();
    expect(html.textContent).toContain("experience");
  });

  it("renders all skill names", async () => {
    const html = await renderAbout();
    expect(html.textContent).toContain("TypeScript");
    expect(html.textContent).toContain("React / Next.js");
    expect(html.textContent).toContain("Node.js / Hono");
    expect(html.textContent).toContain("Java");
    expect(html.textContent).toContain("Springboot");
    expect(html.textContent).toContain("PostgreSQL");
    expect(html.textContent).toContain("Mysql");
    expect(html.textContent).toContain("Redis");
    expect(html.textContent).toContain("Tailwind CSS");
    expect(html.textContent).toContain("Shadcn/ui");
    expect(html.textContent).toContain("ClaudeCode");
    expect(html.textContent).toContain("Docker / CI/CD");
  });
});

describe("AboutPage - A11y (M6: Progress bar semantics)", () => {
  it("skill bars have role='progressbar'", async () => {
    const html = await renderAbout();
    const progressBars = html.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBe(12);
  });

  it("skill bars have correct aria-valuenow", async () => {
    const html = await renderAbout();
    const progressBars = html.querySelectorAll('[role="progressbar"]');

    const expectedLevels = [90, 90, 85, 90, 75, 80, 80, 70, 90, 80, 80, 75];
    for (let i = 0; i < expectedLevels.length; i++) {
      expect(progressBars[i]).toHaveAttribute(
        "aria-valuenow",
        String(expectedLevels[i]!),
      );
    }
  });

  it("skill bars have aria-valuemin='0'", async () => {
    const html = await renderAbout();
    const progressBars = html.querySelectorAll('[role="progressbar"]');
    for (const bar of progressBars) {
      expect(bar).toHaveAttribute("aria-valuemin", "0");
    }
  });

  it("skill bars have aria-valuemax='100'", async () => {
    const html = await renderAbout();
    const progressBars = html.querySelectorAll('[role="progressbar"]');
    for (const bar of progressBars) {
      expect(bar).toHaveAttribute("aria-valuemax", "100");
    }
  });

  it("skill bars have aria-label with skill name", async () => {
    const html = await renderAbout();
    const progressBars = html.querySelectorAll('[role="progressbar"]');

    const expectedLabels = [
      "TypeScript: 90%",
      "React / Next.js: 90%",
      "Node.js / Hono: 85%",
      "Java: 90%",
      "Springboot: 75%",
      "PostgreSQL: 80%",
      "Mysql: 80%",
      "Redis: 70%",
      "Tailwind CSS: 90%",
      "Shadcn/ui: 80%",
      "ClaudeCode: 80%",
      "Docker / CI/CD: 75%",
    ];
    for (let i = 0; i < expectedLabels.length; i++) {
      expect(progressBars[i]).toHaveAttribute("aria-label", expectedLabels[i]!);
    }
  });

  it("progress bar width matches aria-valuenow", async () => {
    const html = await renderAbout();
    const progressBars = html.querySelectorAll<HTMLElement>(
      '[role="progressbar"]',
    );

    for (const bar of progressBars) {
      const valuenow = Number(bar.getAttribute("aria-valuenow"));
      expect(bar.style.width).toBe(`${valuenow}%`);
    }
  });
});

describe("AboutPage generateMetadata", () => {
  it("returns translated title", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.title).toBe("title");
  });

  it("returns translated description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.description).toBe("subtitle");
  });

  it("returns openGraph with title and description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.openGraph?.title).toBe("title");
    expect(metadata.openGraph?.description).toBe("subtitle");
  });

  it("returns openGraph type as profile", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(og(metadata)?.type).toBe("profile");
  });

  it("returns openGraph url", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.openGraph?.url).toBe("https://example.com/zh-CN/about/");
  });

  it("returns openGraph locale", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.openGraph?.locale).toBe("zh_CN");
  });

  it("returns twitter card as summary_large_image", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(tw(metadata)?.card).toBe("summary_large_image");
  });

  it("returns twitter title and description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.twitter?.title).toBe("title");
    expect(metadata.twitter?.description).toBe("subtitle");
  });

  it("uses en-US locale in openGraph when locale is en-US", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en-US" }),
    });
    expect(metadata.openGraph?.locale).toBe("en_US");
  });
});

/**
 * Helper to render a server component and return the container.
 */
async function renderAbout(): Promise<HTMLElement> {
  const element = await AboutPage({
    params: Promise.resolve({ locale: "zh-CN" }),
  });
  const { container } = render(createElement("div", null, element));
  return container;
}
