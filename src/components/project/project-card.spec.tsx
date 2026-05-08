import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectCard } from "./project-card";

import type { ProjectMeta } from "@/lib/projects";

const baseProject: ProjectMeta = {
  slug: "my-project",
  title: "My Project",
  description: "A cool project",
  date: "2026-02-01",
  tags: ["prototype", "industrial"],
  cover: null,
  source: "https://github.com/example/repo",
  demo: "https://example.com",
  featured: true,
  locale: "zh-CN",
};

describe("ProjectCard", () => {
  it("renders the industrial project plate", () => {
    render(<ProjectCard project={baseProject} />);

    expect(screen.getByText("prototype / active")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "My Project",
    );
    expect(screen.getByText("A cool project")).toBeInTheDocument();
    expect(screen.getByText("prototype")).toBeInTheDocument();
    expect(screen.getByText("industrial")).toBeInTheDocument();
  });

  it("links to detail, source, and demo destinations", () => {
    render(<ProjectCard project={baseProject} />);

    expect(screen.getByRole("link", { name: "My Project" })).toHaveAttribute(
      "href",
      "/projects/my-project/",
    );
    expect(screen.getByRole("link", { name: "案例页" })).toHaveAttribute(
      "href",
      "/projects/my-project/",
    );
    expect(screen.getByRole("link", { name: "源代码" })).toHaveAttribute(
      "href",
      "https://github.com/example/repo",
    );
    expect(screen.getByRole("link", { name: "在线演示" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });
});
