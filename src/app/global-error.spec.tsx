import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSiteUrl } = vi.hoisted(() => ({ mockSiteUrl: vi.fn() }));

vi.mock("@/lib/site", () => ({ siteUrl: mockSiteUrl }));

import GlobalError from "./global-error";

const mockRetry = vi.fn();
const error = new Error("test");

function renderGlobalError() {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
    // Expected error reporting is asserted by the retry test.
  });
  render(<GlobalError error={error} unstable_retry={mockRetry} />);

  return consoleError;
}

describe("GlobalError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteUrl.mockReturnValue("/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a Chinese document and error content", () => {
    renderGlobalError();

    expect(document.documentElement).toHaveAttribute("lang", "zh-CN");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "页面暂时无法加载",
    );
    expect(
      screen.getByText("发生了意外错误，请稍后重试。"),
    ).toBeInTheDocument();
    expect(document.title).toBe("页面暂时无法加载");
  });

  it("logs the error and retries when requested", () => {
    const consoleError = renderGlobalError();

    expect(consoleError).toHaveBeenCalledWith(error);
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["root deployment", "/"],
    ["base-path deployment", "/blog/"],
  ])("uses the generated home href for %s", (_deployment, homeHref) => {
    mockSiteUrl.mockReturnValue(homeHref);
    renderGlobalError();

    const homeLink = screen.getByRole("link", { name: "返回首页" });
    expect(mockSiteUrl).toHaveBeenCalledWith("/");
    expect(homeLink).toHaveAttribute("href", homeHref);
  });
});
