vi.stubGlobal(
  "IntersectionObserver",
  class MockIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  },
);

vi.mock("./project-card", () => ({
  ProjectCard: ({
    project,
  }: {
    project: { title: string; [key: string]: unknown };
  }) => createElement("div", { "data-testid": "project-card" }, project.title),
}));

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect } from "vitest";

import { ProjectList } from "./project-list";

import type { ProjectCaseMeta } from "@/lib/content-catalog";

const projects: ProjectCaseMeta[] = [
  {
    slug: "project-1",
    title: "Project One",
    date: "2026-01-15",
    description: "The first complete Project Case.",
    tags: ["Testing"],
    cover: "/assets/project.png",
    source: null,
    demo: null,
    role: "Development",
    duration: "One week",
    result: "Published",
    featured: false,
  },
  {
    slug: "project-2",
    title: "Project Two",
    date: "2026-02-20",
    description: "The second complete Project Case.",
    tags: ["Catalog"],
    cover: "/assets/project.png",
    source: null,
    demo: null,
    role: "Development",
    duration: "Two weeks",
    result: "Published",
    featured: false,
  },
];

describe("ProjectList", () => {
  it("renders ProjectCard for each project", () => {
    render(<ProjectList projects={projects} />);
    expect(screen.getAllByTestId("project-card")).toHaveLength(2);
  });

  it("renders an empty state when projects is empty", () => {
    render(<ProjectList projects={[]} />);
    expect(screen.getByText("暂无项目")).toBeInTheDocument();
  });
});
