import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Footer } from "./footer";

describe("Footer", () => {
  it("renders footer element", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("does not add dynamic year text to the pixel-reference footer", () => {
    render(<Footer />);
    expect(
      screen.queryByText(new RegExp(`${new Date().getFullYear()}`)),
    ).toBeNull();
  });

  it("renders industrial prototype footer text", () => {
    const { container } = render(<Footer />);
    expect(container.textContent).toContain("Scraplog");
    expect(container.textContent).toContain("Built for readable visits");
  });
});
