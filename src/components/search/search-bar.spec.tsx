vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("@/hooks/use-search", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
  const react = require("react") as typeof import("react");
  const { useState, useCallback } = react;
  return {
    useSearch: () => {
      const [query, setQueryState] = useState<string>("");
      const [results, setResults] = useState<
        Array<{
          slug: string;
          title: string;
          summary: string;
          tags: string[];
          locale: string;
          score: number;
        }>
      >([]);
      const [isIndexLoading] = useState<boolean>(false);
      const [error] = useState<string | null>(null);

      const setQuery = useCallback((q: string) => {
        setQueryState(q);
        if (q.includes("hello")) {
          setResults([
            {
              slug: "hello-world",
              title: "Hello World",
              summary: "My first blog post",
              tags: ["general"],
              locale: "zh-CN",
              score: 0.1,
            },
            {
              slug: "nextjs-guide",
              title: "Next.js Guide",
              summary: "A guide to Next.js",
              tags: ["nextjs"],
              locale: "zh-CN",
              score: 0.3,
            },
          ]);
        } else {
          setResults([]);
        }
      }, []);

      const clear = useCallback(() => {
        setQueryState("");
        setResults([]);
      }, []);

      return { query, setQuery, results, isIndexLoading, error, clear };
    },
  };
});

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { SearchBar } from "./search-bar";

describe("SearchBar", () => {
  it("renders search input with placeholder", () => {
    render(<SearchBar locale="zh-CN" placeholder="搜索..." />);
    expect(screen.getByPlaceholderText("搜索...")).toBeInTheDocument();
  });

  it("displays results dropdown when results are available", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "hello" } });

    const items = screen.getAllByRole("option");
    expect(items.length).toBe(2);
  });

  it("navigates to post when result link is clicked", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "hello" } });

    const links = screen.getAllByRole("link");
    const postLink = links.find(
      (l) => l.getAttribute("href") === "/posts/hello-world/",
    );
    expect(postLink).toBeTruthy();
  });

  it("shows no results message when search yields nothing", () => {
    render(
      <SearchBar
        locale="zh-CN"
        placeholder="Search..."
        noResultsText="No results"
      />,
    );

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "xyznonexistent" } });

    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("has correct ARIA attributes on input", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");
    expect(input).toHaveAttribute("role", "combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("shows tag badges for result tags", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "hello" } });

    const tags = screen.getAllByTestId("search-tag");
    expect(tags.length).toBeGreaterThan(0);
  });

  it("shows result title and summary", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "hello" } });

    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.getByText("My first blog post")).toBeInTheDocument();
  });

  it("hides results dropdown when query is cleared", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "hello" } });

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "" } });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("close dropdown on Escape key", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "hello" } });

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes dropdown on click outside", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "hello" } });

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    // Click on body (outside the search container)
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clear button appears when query is non-empty and clears on click", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");

    // No clear button initially
    expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "hello" } });

    const clearButton = screen.getByLabelText("Clear search");
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);

    expect(input).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens dropdown on focus when query has text", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");

    // Type something first
    fireEvent.change(input, { target: { value: "hello" } });

    // Close the dropdown via escape
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    // Re-focus should reopen
    fireEvent.focus(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("does not open dropdown on focus when query is empty", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.focus(input);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("result click closes dropdown", () => {
    render(<SearchBar locale="zh-CN" placeholder="Search..." />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "hello" } });

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    const resultLink = screen.getByText("Hello World").closest("a")!;
    fireEvent.click(resultLink);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  // ==========================================================
  // Keyboard navigation tests
  // ==========================================================

  describe("keyboard navigation", () => {
    it("ArrowDown sets aria-activedescendant and aria-selected", () => {
      render(<SearchBar locale="zh-CN" placeholder="Search..." />);

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "hello" } });

      // ArrowDown once — should highlight first option
      fireEvent.keyDown(input, { key: "ArrowDown" });

      expect(input).toHaveAttribute("aria-activedescendant", "search-option-0");

      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
      expect(options[1]).toHaveAttribute("aria-selected", "false");
    });

    it("ArrowDown wraps around to first option", () => {
      render(<SearchBar locale="zh-CN" placeholder="Search..." />);

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "hello" } });

      // Move to last option
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });

      expect(input).toHaveAttribute("aria-activedescendant", "search-option-1");

      // ArrowDown again — wraps to first
      fireEvent.keyDown(input, { key: "ArrowDown" });

      expect(input).toHaveAttribute("aria-activedescendant", "search-option-0");
    });

    it("ArrowUp wraps around to last option", () => {
      render(<SearchBar locale="zh-CN" placeholder="Search..." />);

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "hello" } });

      // ArrowUp from no selection — wraps to last
      fireEvent.keyDown(input, { key: "ArrowUp" });

      expect(input).toHaveAttribute("aria-activedescendant", "search-option-1");
    });

    it("Enter on active option clicks the link", () => {
      render(<SearchBar locale="zh-CN" placeholder="Search..." />);

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "hello" } });

      // Highlight first option
      fireEvent.keyDown(input, { key: "ArrowDown" });

      // Enter should navigate (click the link)
      fireEvent.keyDown(input, { key: "Enter" });

      // The dropdown should close after navigation
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("Enter with no active option does nothing special", () => {
      render(<SearchBar locale="zh-CN" placeholder="Search..." />);

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "hello" } });

      // Enter without ArrowDown — no active option
      fireEvent.keyDown(input, { key: "Enter" });

      // Dropdown should still be open
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("active index becomes invalid when results shrink", () => {
      render(<SearchBar locale="zh-CN" placeholder="Search..." />);

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "hello" } });

      // Highlight second option
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(input).toHaveAttribute("aria-activedescendant", "search-option-1");

      // Change query to something with no results — activeIndex out of range
      fireEvent.change(input, { target: { value: "xyz" } });

      // activeId should be undefined since activeIndex >= results.length
      expect(input).not.toHaveAttribute("aria-activedescendant");
    });
  });
});
