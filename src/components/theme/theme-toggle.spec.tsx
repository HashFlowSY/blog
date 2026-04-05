const mockSetTheme = vi.fn();
let mockResolvedTheme: string = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    setTheme: mockSetTheme,
    resolvedTheme: mockResolvedTheme,
  }),
}));

vi.mock("lucide-react", () => ({
  Sun: ({ className }: { className?: string }) =>
    createElement("svg", { "data-testid": "sun-icon", className }),
  Moon: ({ className }: { className?: string }) =>
    createElement("svg", { "data-testid": "moon-icon", className }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => createElement("button", props, children),
}));

import { render, screen, fireEvent, act } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockResolvedTheme = "light";

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      return window.setTimeout(() => cb(Date.now()), 0);
    }) as unknown as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders disabled button before mount", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(screen.getByTestId("sun-icon")).toBeInTheDocument();
  });

  it("renders Moon icon when theme is light after mount", async () => {
    mockResolvedTheme = "light";
    render(<ThemeToggle />);

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId("moon-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("sun-icon")).not.toBeInTheDocument();
  });

  it("renders Sun icon when theme is dark after mount", async () => {
    mockResolvedTheme = "dark";
    render(<ThemeToggle />);

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByTestId("sun-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("moon-icon")).not.toBeInTheDocument();
  });

  it("click toggles from light to dark", async () => {
    mockResolvedTheme = "light";
    render(<ThemeToggle />);

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    fireEvent.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("click toggles from dark to light", async () => {
    mockResolvedTheme = "dark";
    render(<ThemeToggle />);

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    fireEvent.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("button has aria-label", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Toggle theme",
    );
  });
});
