import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectCard } from "./project-card";

import type { ProjectCaseMeta } from "@/lib/content-catalog";

const baseProject: ProjectCaseMeta = {
  slug: "my-project",
  title: "My Project",
  description: "A cool project",
  date: "2026-02-01",
  tags: ["prototype", "industrial"],
  cover: "/assets/project.png",
  source: "https://github.com/example/repo",
  demo: "https://example.com",
  featured: true,
  role: "独立设计与开发",
  duration: "4 周",
  result: "完成可运行版本",
};

describe("ProjectCard", () => {
  it("renders project positioning, facts, and tags", () => {
    render(<ProjectCard project={baseProject} />);

    expect(screen.getByText("项目案例")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "My Project",
    );
    expect(screen.getByText("A cool project")).toBeInTheDocument();
    expect(screen.getByText("独立设计与开发")).toBeInTheDocument();
    expect(screen.getByText("完成可运行版本")).toBeInTheDocument();
    expect(screen.getByText("prototype")).toBeInTheDocument();
    expect(screen.getByText("industrial")).toBeInTheDocument();
  });

  it("links to detail, source, and demo destinations", () => {
    render(<ProjectCard project={baseProject} />);

    expect(screen.getByRole("link", { name: "My Project" })).toHaveAttribute(
      "href",
      "/projects/my-project/",
    );
    expect(screen.getByRole("link", { name: "查看案例" })).toHaveAttribute(
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
