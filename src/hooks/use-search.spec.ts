import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { useSearch } from "./use-search";

import type { SearchIndexEntry } from "@/lib/search/search-types";

const mockIndex: SearchIndexEntry[] = [
  {
    slug: "hello-world",
    title: "Hello World",
    summary: "My first blog post",
    tags: ["general"],
    content: "Welcome to my blog about web development",
    locale: "zh-CN",
  },
  {
    slug: "nextjs-guide",
    title: "Building a Static Blog with Next.js",
    summary: "A guide to building a static blog",
    tags: ["nextjs", "tutorial"],
    content:
      "Learn how to build a blog with Next.js and deploy to GitHub Pages",
    locale: "zh-CN",
  },
  {
    slug: "react-tips",
    title: "React Tips and Tricks",
    summary: "Useful React patterns",
    tags: ["react"],
    content: "Some advanced React patterns for building better apps",
    locale: "en-US",
  },
];

describe("useSearch", () => {
  beforeEach(() => {
    const mockJson = Promise.resolve(mockIndex);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => mockJson,
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty state initially", () => {
    const { result } = renderHook(() => useSearch("zh-CN"));

    expect(result.current.query).toBe("");
    expect(result.current.results).toEqual([]);
    expect(result.current.isIndexLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("starts loading index on first setQuery", () => {
    const { result } = renderHook(() => useSearch("zh-CN"));

    act(() => {
      result.current.setQuery("hello");
    });

    expect(result.current.isIndexLoading).toBe(true);
  });

  it("returns results after index loads", async () => {
    const { result } = renderHook(() => useSearch("zh-CN"));

    act(() => {
      result.current.setQuery("hello");
    });

    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    expect(result.current.isIndexLoading).toBe(false);
    expect(result.current.results[0]!.slug).toBe("hello-world");
  });

  it("clears results when query is empty", async () => {
    const { result } = renderHook(() => useSearch("zh-CN"));

    act(() => {
      result.current.setQuery("hello");
    });

    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    act(() => {
      result.current.setQuery("");
    });

    expect(result.current.results).toEqual([]);
  });

  it("clear() resets query and results", async () => {
    const { result } = renderHook(() => useSearch("zh-CN"));

    act(() => {
      result.current.setQuery("hello");
    });

    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    act(() => {
      result.current.clear();
    });

    expect(result.current.query).toBe("");
    expect(result.current.results).toEqual([]);
  });

  it("filters results by locale", async () => {
    const { result } = renderHook(() => useSearch("en-US"));

    act(() => {
      result.current.setQuery("react");
    });

    await waitFor(
      () => {
        expect(result.current.results).toHaveLength(1);
      },
      { timeout: 3000 },
    );

    expect(result.current.results[0]!.locale).toBe("en-US");
  });

  it("sets error state when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    const { result } = renderHook(() => useSearch("zh-CN"));

    act(() => {
      result.current.setQuery("hello");
    });

    await waitFor(
      () => {
        expect(result.current.error).toBeTruthy();
      },
      { timeout: 3000 },
    );

    expect(result.current.results).toEqual([]);
  });

  it("reuses cached index on subsequent searches", async () => {
    const { result } = renderHook(() => useSearch("zh-CN"));

    act(() => {
      result.current.setQuery("hello");
    });

    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    act(() => {
      result.current.setQuery("nextjs");
    });

    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );
  });

  it("returns results sorted by score (best match first)", async () => {
    const { result } = renderHook(() => useSearch("zh-CN"));

    act(() => {
      result.current.setQuery("blog");
    });

    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    const scores = result.current.results.map((r) => r.score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]!).toBeGreaterThanOrEqual(scores[i - 1]!);
    }
  });

  it("searches with cached index after first load", async () => {
    const { result } = renderHook(() => useSearch("zh-CN"));

    act(() => {
      result.current.setQuery("hello");
    });

    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Wait for debounce period, then change query
    await new Promise((r) => setTimeout(r, 300));

    act(() => {
      result.current.setQuery("react");
    });

    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );
  });

  it("invalidates cache when locale changes", async () => {
    const { result, rerender } = renderHook(({ locale }) => useSearch(locale), {
      initialProps: { locale: "zh-CN" },
    });

    act(() => {
      result.current.setQuery("blog");
    });

    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    expect(fetch).toHaveBeenCalledTimes(1);

    // Switch locale — should trigger a new fetch
    rerender({ locale: "en-US" });

    act(() => {
      result.current.setQuery("blog");
    });

    await waitFor(
      () => {
        expect(fetch).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 },
    );
  });

  it("sets error for non-ok HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve([]),
      }),
    );

    const { result } = renderHook(() => useSearch("zh-CN"));

    act(() => {
      result.current.setQuery("hello");
    });

    await waitFor(
      () => {
        expect(result.current.error).toBeTruthy();
      },
      { timeout: 3000 },
    );

    expect(result.current.error).toContain("HTTP 404");
  });
});
