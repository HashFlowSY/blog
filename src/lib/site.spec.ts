import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("siteUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, NODE_ENV: "development" };
    delete process.env["NEXT_PUBLIC_BASE_PATH"];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses an HTTPS NEXT_PUBLIC_SITE_URL for a production build", async () => {
    process.env = { ...process.env, NODE_ENV: "production" };
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

  it("retains BASE_PATH in relative URLs when the origin is not set", async () => {
    delete process.env["NEXT_PUBLIC_SITE_URL"];
    process.env["BASE_PATH"] = "/blog";
    const { siteUrl } = await import("./site");
    expect(siteUrl("/about/")).toBe("/blog/about/");
  });

  it("appends BASE_PATH when set", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    process.env["BASE_PATH"] = "/blog";
    const { siteUrl } = await import("./site");
    expect(siteUrl("/posts/test/")).toBe(
      "https://example.com/blog/posts/test/",
    );
  });

  it("prefixes a route whose first segment matches BASE_PATH", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    process.env["BASE_PATH"] = "/posts";
    const { siteUrl } = await import("./site");

    expect(siteUrl("/posts/test/")).toBe(
      "https://example.com/posts/posts/test/",
    );
  });

  it("composes the root deployment URL without a double slash", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    process.env["BASE_PATH"] = "";
    const { siteUrl } = await import("./site");
    expect(siteUrl("/")).toBe("https://example.com/");
  });

  it("rejects a path without a leading slash", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    process.env["BASE_PATH"] = "";
    const { siteUrl } = await import("./site");

    expect(() => siteUrl("posts/test/")).toThrow(
      "root-relative path beginning with '/'",
    );
  });

  it("preserves trailing slash", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    process.env["BASE_PATH"] = "";
    const { siteUrl } = await import("./site");
    expect(siteUrl("/about/")).toBe("https://example.com/about/");
  });

  it("uses an empty base path when BASE_PATH is not set", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    delete process.env["BASE_PATH"];
    const { BASE_PATH } = await import("./site");
    expect(BASE_PATH).toBe("");
  });

  it("omits BASE_PATH when it is undefined but BASE_URL is set", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    delete process.env["BASE_PATH"];
    const { siteUrl } = await import("./site");
    expect(siteUrl("/posts/test/")).toBe("https://example.com/posts/test/");
  });
});

describe("release configuration validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, NODE_ENV: "development" };
    delete process.env["NEXT_PUBLIC_BASE_PATH"];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("requires NEXT_PUBLIC_SITE_URL for a production build", async () => {
    process.env = { ...process.env, NODE_ENV: "production" };
    delete process.env["NEXT_PUBLIC_SITE_URL"];
    process.env["BASE_PATH"] = "";

    await expect(import("./site")).rejects.toThrow(
      "NEXT_PUBLIC_SITE_URL is required in production",
    );
  });

  it("rejects an HTTP localhost origin for a production build", async () => {
    process.env = { ...process.env, NODE_ENV: "production" };
    process.env["NEXT_PUBLIC_SITE_URL"] = "http://localhost:3000";
    process.env["BASE_PATH"] = "";

    await expect(import("./site")).rejects.toThrow(
      "Invalid NEXT_PUBLIC_SITE_URL",
    );
  });

  it.each([
    "https://example.com/blog",
    "https://example.com?preview=true",
    "https://example.com#section",
    "https://example.com/",
    "http://example.com",
  ])("rejects an invalid release origin: %s", async (origin) => {
    process.env["NEXT_PUBLIC_SITE_URL"] = origin;
    process.env["BASE_PATH"] = "";

    await expect(import("./site")).rejects.toThrow(
      "Invalid NEXT_PUBLIC_SITE_URL",
    );
  });

  it("accepts an HTTP localhost origin for local development", async () => {
    process.env = { ...process.env, NODE_ENV: "development" };
    process.env["NEXT_PUBLIC_SITE_URL"] = "http://localhost:3000";
    process.env["BASE_PATH"] = "";
    const { siteUrl } = await import("./site");

    expect(siteUrl("/about/")).toBe("http://localhost:3000/about/");
  });

  it.each(["blog", "/", "/blog/", "/blog//preview", "/blog?preview=true"])(
    "rejects an invalid base path: %s",
    async (basePath) => {
      process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
      process.env["BASE_PATH"] = basePath;

      await expect(import("./site")).rejects.toThrow("Invalid BASE_PATH");
    },
  );

  it("rejects mismatched server and public base paths", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";
    process.env["BASE_PATH"] = "/blog";
    process.env["NEXT_PUBLIC_BASE_PATH"] = "/preview";

    await expect(import("./site")).rejects.toThrow(
      "BASE_PATH and NEXT_PUBLIC_BASE_PATH must match",
    );
  });
});

describe("assetPath", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, NODE_ENV: "development" };
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

  it("uses the matching public base path for client-visible assets", async () => {
    process.env["BASE_PATH"] = "/blog";
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

  it("prefixes an asset path whose first segment matches BASE_PATH", async () => {
    process.env["BASE_PATH"] = "/assets";
    const { assetPath } = await import("./site");

    expect(assetPath("/assets/workbench-hero.png")).toBe(
      "/assets/assets/workbench-hero.png",
    );
  });
});
