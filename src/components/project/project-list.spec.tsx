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

import type { ProjectMeta } from "@/lib/projects";

const projects: ProjectMeta[] = [
  {
    slug: "project-1",
    title: "Project One",
    date: "2026-01-15",
    description: "",
    tags: [],
    cover: null,
    source: null,
    demo: null,
    featured: false,
  },
  {
    slug: "project-2",
    title: "Project Two",
    date: "2026-02-20",
    description: "",
    tags: [],
    cover: null,
    source: null,
    demo: null,
    featured: false,
  },
];

describe("ProjectList", () => {
  it("renders ProjectCard for each project", () => {
    render(<ProjectList projects={projects} />);
    expect(screen.getAllByTestId("project-card")).toHaveLength(2);
  });

  it("returns null when projects is empty", () => {
    const { container } = render(<ProjectList projects={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
