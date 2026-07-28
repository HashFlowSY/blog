import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("siteUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env["NEXT_PUBLIC_BASE_PATH"];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses NEXT_PUBLIC_SITE_URL when set", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    process.env["BASE_PATH"] = "";
    const { siteUrl, BASE_URL } = await import("./site");
    expect(BASE_URL).toBe("https://example.com");
    expect(siteUrl("/about/")).toBe("https://example.com/about/");
  });

  it("returns undefined when NEXT_PUBLIC_SITE_URL is not set", async () => {
    delete process.env["NEXT_PUBLIC_SITE_URL"];
    process.env["BASE_PATH"] = "";
    const { BASE_URL, siteUrl } = await import("./site");
    expect(BASE_URL).toBeUndefined();
    // siteUrl returns path as-is when BASE_URL is missing
    expect(siteUrl("/about/")).toBe("/about/");
  });

  it("ignores BASE_PATH when BASE_URL is not set", async () => {
    delete process.env["NEXT_PUBLIC_SITE_URL"];
    process.env["BASE_PATH"] = "/blog";
    const { siteUrl } = await import("./site");
    expect(siteUrl("/about/")).toBe("/about/");
  });

  it("appends BASE_PATH when set", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    process.env["BASE_PATH"] = "/blog";
    const { siteUrl } = await import("./site");
    expect(siteUrl("/posts/test/")).toBe(
      "https://example.com/blog/posts/test/",
    );
  });

  it("handles empty path", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    process.env["BASE_PATH"] = "";
    const { siteUrl } = await import("./site");
    expect(siteUrl("")).toBe("https://example.com");
  });

  it("handles path without leading slash", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    process.env["BASE_PATH"] = "";
    const { siteUrl } = await import("./site");
    expect(siteUrl("posts/test/")).toBe("https://example.composts/test/");
  });

  it("preserves trailing slash", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    process.env["BASE_PATH"] = "";
    const { siteUrl } = await import("./site");
    expect(siteUrl("/about/")).toBe("https://example.com/about/");
  });

  it("returns undefined when BASE_PATH is not set", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    delete process.env["BASE_PATH"];
    const { BASE_PATH } = await import("./site");
    expect(BASE_PATH).toBeUndefined();
  });

  it("omits BASE_PATH when it is undefined but BASE_URL is set", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    delete process.env["BASE_PATH"];
    const { siteUrl } = await import("./site");
    expect(siteUrl("/posts/test/")).toBe("https://example.com/posts/test/");
  });
});

describe("assetPath", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env["NEXT_PUBLIC_BASE_PATH"];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("keeps a root-relative asset path during local development", async () => {
    delete process.env["BASE_PATH"];
    const { assetPath } = await import("./site");

    expect(assetPath("/assets/workbench-hero.png")).toBe(
      "/assets/workbench-hero.png",
    );
  });

  it("prefixes root-relative asset paths for a GitHub Pages deployment", async () => {
    process.env["BASE_PATH"] = "/blog";
    const { assetPath } = await import("./site");

    expect(assetPath("/assets/workbench-hero.png")).toBe(
      "/blog/assets/workbench-hero.png",
    );
  });

  it("uses the public base path when it is available to client components", async () => {
    process.env["BASE_PATH"] = "/server-only";
    process.env.NEXT_PUBLIC_BASE_PATH = "/blog";
    const { assetPath, BASE_PATH } = await import("./site");

    expect(BASE_PATH).toBe("/blog");
    expect(assetPath("/assets/workbench-hero.png")).toBe(
      "/blog/assets/workbench-hero.png",
    );
  });

  it("leaves external asset URLs unchanged", async () => {
    process.env["BASE_PATH"] = "/blog";
    const { assetPath } = await import("./site");

    expect(assetPath("https://example.com/image.png")).toBe(
      "https://example.com/image.png",
    );
  });

  it("leaves non-HTTP URI asset sources unchanged", async () => {
    process.env["BASE_PATH"] = "/blog";
    const { assetPath } = await import("./site");

    expect(assetPath("data:image/svg+xml,%3Csvg%20/%3E")).toBe(
      "data:image/svg+xml,%3Csvg%20/%3E",
    );
  });

  it("does not add the base path twice", async () => {
    process.env["BASE_PATH"] = "/blog";
    const { assetPath } = await import("./site");

    expect(assetPath("/blog/assets/workbench-hero.png")).toBe(
      "/blog/assets/workbench-hero.png",
    );
  });
});
