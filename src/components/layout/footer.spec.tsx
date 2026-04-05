import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Footer } from "./footer";

describe("Footer", () => {
  it("renders footer element", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("displays current year", () => {
    render(<Footer />);
    expect(
      screen.getByText(new RegExp(`${new Date().getFullYear()}`)),
    ).toBeInTheDocument();
  });

  it("renders rights and builtWith text", () => {
    const { container } = render(<Footer />);
    // next-intl mock returns key: t("rights") → "rights", t("builtWith") → "builtWith"
    expect(container.textContent).toContain("rights");
    expect(container.textContent).toContain("builtWith");
  });
});
