import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import GlobalError from "./global-error";

const mockRetry = vi.fn();

describe("GlobalError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders error heading", () => {
    render(
      <GlobalError error={new Error("test")} unstable_retry={mockRetry} />,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders error description", () => {
    render(
      <GlobalError error={new Error("test")} unstable_retry={mockRetry} />,
    );
    expect(
      screen.getByText("An unexpected error occurred. Please try again."),
    ).toBeInTheDocument();
  });

  it("renders Try again button", () => {
    render(
      <GlobalError error={new Error("test")} unstable_retry={mockRetry} />,
    );
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders Back to Home button", () => {
    render(
      <GlobalError error={new Error("test")} unstable_retry={mockRetry} />,
    );
    expect(screen.getByText("Back to Home")).toBeInTheDocument();
  });

  it("Try again button calls unstable_retry on click", () => {
    render(
      <GlobalError error={new Error("test")} unstable_retry={mockRetry} />,
    );
    fireEvent.click(screen.getByText("Try again"));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});

describe("GlobalError - A11y (H6: Heading hierarchy)", () => {
  it("uses h1 element for error heading instead of h2", () => {
    render(
      <GlobalError error={new Error("test")} unstable_retry={mockRetry} />,
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Something went wrong");
  });

  it("does not render h2 element", () => {
    render(
      <GlobalError error={new Error("test")} unstable_retry={mockRetry} />,
    );
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });
});
