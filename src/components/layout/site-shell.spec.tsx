import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SiteShell } from "./site-shell";

vi.mock("./back-to-top", () => ({
  BackToTop: () => <button type="button">回到顶部</button>,
}));

vi.mock("./footer", () => ({
  Footer: () => <footer>页脚</footer>,
}));

vi.mock("./header", () => ({
  Header: () => <header>页眉</header>,
}));

vi.mock("./route-state", () => ({
  RouteState: () => <span data-testid="route-state" />,
}));

describe("SiteShell", () => {
  it("wraps page content with the shared shell landmarks", () => {
    render(
      <SiteShell>
        <h1>页面内容</h1>
      </SiteShell>,
    );

    expect(screen.getByRole("link", { name: "跳到内容" })).toHaveAttribute(
      "href",
      "#content",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "content");
    expect(
      screen.getByRole("heading", { name: "页面内容" }),
    ).toBeInTheDocument();
    expect(screen.getByText("页眉")).toBeInTheDocument();
    expect(screen.getByText("页脚")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "回到顶部" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("route-state")).toBeInTheDocument();
  });
});
