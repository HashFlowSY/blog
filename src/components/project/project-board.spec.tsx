import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectBoard } from "./project-board";

import type { ProjectMeta } from "@/lib/projects";

const projects: ProjectMeta[] = [
  {
    slug: "first-project",
    title: "第一个项目",
    date: "2026-01-01",
    description: "项目摘要",
    tags: ["Next.js"],
    cover: null,
    source: null,
    demo: null,
    featured: true,
    locale: "zh-CN",
  },
  {
    slug: "second-project",
    title: "第二个项目",
    date: "2026-02-01",
    description: "另一个项目摘要",
    tags: ["Design"],
    cover: null,
    source: null,
    demo: null,
    featured: false,
    locale: "zh-CN",
  },
];

describe("ProjectBoard", () => {
  it("renders filter controls and the full project list", () => {
    render(<ProjectBoard projects={projects} tags={["Next.js", "Design"]} />);

    expect(screen.getByLabelText("项目筛选")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全部" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("heading", { name: "第一个项目" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "第二个项目" }),
    ).toBeInTheDocument();
  });

  it("filters projects by tag", () => {
    render(<ProjectBoard projects={projects} tags={["Next.js", "Design"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Design" }));

    expect(
      screen.queryByRole("heading", { name: "第一个项目" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "第二个项目" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Design" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders the project list empty state when a selected tag has no matches", () => {
    render(<ProjectBoard projects={projects} tags={["未匹配"]} />);

    fireEvent.click(screen.getByRole("button", { name: "未匹配" }));

    expect(screen.getByText("暂无项目")).toBeInTheDocument();
  });
});
