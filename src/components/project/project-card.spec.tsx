vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("@/components/tag", () => ({
  TagBadge: ({ tag }: { tag: string }) =>
    createElement("span", { "data-testid": "tag-badge" }, tag),
}));

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect } from "vitest";

import { ProjectCard } from "./project-card";

import type { ProjectMeta } from "@/lib/projects";

const baseProject: ProjectMeta = {
  slug: "my-project",
  title: "My Project",
  description: "A cool project",
  date: "2026-02-01",
  tags: ["rust", "wasm"],
  cover: null,
  source: "https://github.com/example/repo",
  demo: "https://example.com",
  featured: false,
};

describe("ProjectCard", () => {
  it("renders project title", () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText("My Project")).toBeInTheDocument();
  });

  it("renders description when present", () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText("A cool project")).toBeInTheDocument();
  });

  it("does not render description when empty", () => {
    const noDesc = { ...baseProject, description: "" };
    render(<ProjectCard project={noDesc} />);
    expect(screen.queryByText("A cool project")).not.toBeInTheDocument();
  });

  it("renders TagBadge for each tag", () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getAllByTestId("tag-badge")).toHaveLength(2);
  });

  it("does not render tags section when tags empty", () => {
    const noTags = { ...baseProject, tags: [] };
    render(<ProjectCard project={noTags} />);
    expect(screen.queryByTestId("tag-badge")).not.toBeInTheDocument();
  });

  it("links to /projects/{slug}/", () => {
    render(<ProjectCard project={baseProject} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/projects/my-project/");
  });

  it("renders source link text when source is present", () => {
    render(<ProjectCard project={baseProject} />);
    // next-intl mock returns key: t("source") -> "source"
    expect(screen.getByText("source")).toBeInTheDocument();
  });

  it("does not render source when source is null", () => {
    const noSource = { ...baseProject, source: null };
    render(<ProjectCard project={noSource} />);
    expect(screen.queryByText("source")).not.toBeInTheDocument();
  });

  it("renders demo link text when demo is present", () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText("demo")).toBeInTheDocument();
  });

  it("does not render demo when demo is null", () => {
    const noDemo = { ...baseProject, demo: null };
    render(<ProjectCard project={noDemo} />);
    expect(screen.queryByText("demo")).not.toBeInTheDocument();
  });
});

describe("ProjectCard - A11y (H6: Heading hierarchy)", () => {
  it("uses h2 element for project title instead of h3", () => {
    render(<ProjectCard project={baseProject} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("My Project");
  });

  it("does not render h3 element", () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });
});
