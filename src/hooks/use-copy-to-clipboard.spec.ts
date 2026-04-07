import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { useCopyToClipboard } from "./use-copy-to-clipboard";

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns copied as false initially", () => {
    const { result } = renderHook(() => useCopyToClipboard("hello"));
    expect(result.current.copied).toBe(false);
  });

  it("sets copied to true after successful copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useCopyToClipboard("hello"));

    await act(async () => {
      await result.current.copy();
    });

    expect(writeText).toHaveBeenCalledWith("hello");
    expect(result.current.copied).toBe(true);
  });

  it("resets copied to false after 2 seconds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useCopyToClipboard("hello"));

    await act(async () => {
      await result.current.copy();
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.copied).toBe(false);
  });

  it("handles clipboard rejection gracefully", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    const { result } = renderHook(() => useCopyToClipboard("hello"));

    await act(async () => {
      await result.current.copy();
    });

    expect(result.current.copied).toBe(false);
  });
});
