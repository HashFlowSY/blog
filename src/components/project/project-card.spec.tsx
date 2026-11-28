import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compileMarkdownDocuments } from "@/lib/markdown/compile";

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

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "My Project",
    );
    expect(screen.getByText("A cool project")).toBeInTheDocument();
    expect(screen.getByText("独立设计与开发")).toBeInTheDocument();
    expect(screen.getByText("完成可运行版本")).toBeInTheDocument();
    expect(screen.getByText("prototype")).toBeInTheDocument();
    expect(screen.getByText("industrial")).toBeInTheDocument();
  });

  it("makes the preview and copy part of one project detail link", () => {
    render(<ProjectCard project={baseProject} />);

    const link = screen.getByRole("link", { name: "My Project" });
    expect(link).toHaveAttribute("href", "/projects/my-project/");
    expect(link).toContainElement(
      screen.getByRole("img", { name: "My Project界面预览" }),
    );
    expect(link).toContainElement(screen.getByText("A cool project"));
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByText("项目速览")).toBeNull();
  });

  it("builds the glance from real evidence and links to its compiled heading", async () => {
    const filePath = "content/projects/zh-CN/my-project.md";
    const body =
      "## 概述\n\n仅有描述。\n\n## 检索\n\n检查返回结果。原文还有下文。\n\n---\n\n### 命中片段\n\n返回结果。\n\n## 截图\n\n---\n\n![预览](/assets/project.png)";
    const documents = await compileMarkdownDocuments(
      [{ filePath, bodyLine: 1, body, title: "My Project" }],
      { basePath: "" },
    );
    const chapters = documents.get(filePath)!.tree;
    render(<ProjectCard project={baseProject} chapters={chapters} />);
    const glance = screen.getByText("项目速览").closest("details")!;
    expect(
      Array.from(glance.querySelectorAll("a"), (link) =>
        decodeURIComponent(link.hash),
      ),
    ).toEqual(["#user-content-命中片段", "#user-content-截图"]);
    expect(glance).toHaveTextContent("检查返回结果。");
    expect(glance).not.toHaveTextContent("原文还有下文");
    expect(
      screen.getByRole("link", { name: "My Project" }),
    ).not.toContainElement(glance);
  });
});
