import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RouteState } from "./route-state";

const usePathnameMock = vi.hoisted(() => vi.fn(() => "/"));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

describe("RouteState", () => {
  afterEach(() => {
    document.body.removeAttribute("data-route");
    usePathnameMock.mockReturnValue("/");
  });

  it.each([
    ["/", "home"],
    ["/posts/", "articles"],
    ["/projects/personal-blog/", "projects"],
    ["/about/", "about"],
  ])("sets body route for %s", (pathname, route) => {
    usePathnameMock.mockReturnValue(pathname);

    render(<RouteState />);

    expect(document.body.dataset["route"]).toBe(route);
  });
});
