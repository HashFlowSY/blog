import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectCase } from "@/lib/content-catalog";

const { mockGetContentCatalog } = vi.hoisted(() => ({
  mockGetContentCatalog: vi.fn(),
}));

vi.mock("@/components/post/code-block", () => ({
  CodeBlockEnhancer: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/content-catalog", () => ({
  getContentCatalog: mockGetContentCatalog,
}));

vi.mock("@/lib/site", () => ({
  SITE: {
    githubProfile: {
      label: "HashFlowSY",
      url: "https://github.com/HashFlowSY",
    },
  },
  assetPath: (asset: string) => asset,
  siteUrl: (pathname: string) => new URL(pathname, "https://example.com"),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill: _fill,
    preload: _preload,
    ...props
  }: React.ComponentProps<"img"> & { fill?: boolean; preload?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

import ProjectDetailPage from "./page";

const projectCase: ProjectCase = {
  slug: "structured-project",
  title: "Structured Project",
  description: "A Project Case rendered by the Content Catalog.",
  date: "2026-04-02",
  tags: ["Testing"],
  cover: "/assets/project.png",
  source: null,
  demo: null,
  role: "Development",
  duration: "Two weeks",
  result: "Published",
  featured: true,
  renderedContent: {
    html: '<h2 id="project-section">Project section</h2><p>Structured body.</p>',
    headings: [{ id: "project-section", level: 2, text: "Project section" }],
  },
};

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    mockGetContentCatalog.mockResolvedValue({
      getProjectCaseBySlug: (slug: string) =>
        slug === projectCase.slug ? projectCase : null,
    });
  });

  it("renders HTML from the Project Case structured Markdown result", async () => {
    const page = await ProjectDetailPage({
      params: Promise.resolve({ slug: projectCase.slug }),
    });
    const { getByRole, getByText } = render(page);

    expect(
      getByRole("heading", { level: 2, name: "Project section" }),
    ).toHaveAttribute("id", "project-section");
    expect(getByText("Structured body.")).toBeInTheDocument();
  });
});
