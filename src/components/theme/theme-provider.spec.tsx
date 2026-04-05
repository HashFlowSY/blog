vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-testid": "theme-provider" }, children),
}));

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect } from "vitest";

import { ThemeProvider } from "./theme-provider";

describe("ThemeProvider", () => {
  it("renders children", () => {
    render(<ThemeProvider>child content</ThemeProvider>);
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("wraps children in theme-provider container", () => {
    render(<ThemeProvider>content</ThemeProvider>);
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
  });
});
