import "@testing-library/jest-dom/vitest";

import { createElement } from "react";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    replace: _replace,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => {
    return createElement("a", { href, ...props }, children);
  },
}));
