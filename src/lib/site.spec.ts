import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("siteUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
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
    const { BASE_URL } = await import("./site");
    expect(BASE_URL).toBeUndefined();
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
});
