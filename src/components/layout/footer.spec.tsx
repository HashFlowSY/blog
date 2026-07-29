import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { SITE } from "@/lib/site";

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

  it("renders portfolio footer text", () => {
    const { container } = render(<Footer />);
    expect(container.textContent).toContain(SITE.name);
    expect(container.textContent).toContain("求职或合作");
    expect(
      screen.getByRole("link", { name: SITE.githubProfile.label }),
    ).toHaveAttribute("href", SITE.githubProfile.url);
  });
});
