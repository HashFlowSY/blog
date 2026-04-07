import { act, render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ShareButtons } from "./share-buttons";

describe("ShareButtons", () => {
  const props = {
    url: "https://example.com/posts/test-post/",
    title: "Test Post Title",
  };

  beforeEach(() => {
    // Default: Web Share API not available
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share: undefined,
    });
  });

  it("renders share buttons", () => {
    const { container } = render(<ShareButtons {...props} />);
    const buttons = container.querySelectorAll("button");
    // Native share not available: only Twitter + Copy link
    expect(buttons).toHaveLength(2);
  });

  it("renders native share button when Web Share API is available", () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share: vi.fn().mockResolvedValue(undefined),
    });

    const { container } = render(<ShareButtons {...props} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(3);
  });

  it("Twitter button opens tweet intent", () => {
    const openSpy = vi.fn();
    vi.stubGlobal("window", { open: openSpy });

    const { getByLabelText } = render(<ShareButtons {...props} />);
    fireEvent.click(getByLabelText("Share on Twitter"));

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("twitter.com/intent/tweet"),
      "_blank",
      expect.any(String),
    );
  });

  it("Copy link button copies URL to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
      share: undefined,
    });

    const { getByLabelText } = render(<ShareButtons {...props} />);
    fireEvent.click(getByLabelText("Copy link"));

    expect(writeText).toHaveBeenCalledWith(props.url);
  });

  it("shows Copied! feedback after copying link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
      share: undefined,
    });

    const { getByLabelText } = render(<ShareButtons {...props} />);
    const copyButton = getByLabelText("Copy link");
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(copyButton).toHaveTextContent("Copied!");
  });

  it("native share button calls navigator.share", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share,
    });

    const { getByLabelText } = render(<ShareButtons {...props} />);
    fireEvent.click(getByLabelText("Share"));

    expect(share).toHaveBeenCalledWith({
      url: props.url,
      title: props.title,
    });
  });

  it("native share failure does not throw", async () => {
    const share = vi.fn().mockRejectedValue(new Error("AbortError"));
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share,
    });

    const { getByLabelText } = render(<ShareButtons {...props} />);
    expect(() => fireEvent.click(getByLabelText("Share"))).not.toThrow();
  });
});
