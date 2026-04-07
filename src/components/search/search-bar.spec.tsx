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
});
