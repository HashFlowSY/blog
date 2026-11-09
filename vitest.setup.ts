import "@testing-library/jest-dom/vitest";

import { createElement } from "react";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => {
    return createElement("a", { href, ...props }, children);
  },
}));
