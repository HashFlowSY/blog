import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// vi.hoisted — 在 vi.mock 提升之前定义 mock 函数
// ============================================================

const { mockReaddirSync, mockReadFileSync, mockExistsSync } = vi.hoisted(
  () => ({
    mockReaddirSync: vi.fn<(dir: string) => string[]>(),
    mockReadFileSync: vi.fn<(filePath: string, encoding: string) => string>(),
    mockExistsSync: vi.fn<(dir: string) => boolean>(),
  }),
);

vi.mock("fs", () => {
  const mockFs = {
    existsSync: mockExistsSync,
    readdirSync: mockReaddirSync,
    readFileSync: mockReadFileSync,
  };
  return { default: mockFs, ...mockFs };
});

vi.mock("path", () => ({
  join: (...args: string[]) => args.join("/"),
  default: { join: (...args: string[]) => args.join("/") },
}));

vi.mock("./markdown", () => ({
  markdownToHtml: vi.fn().mockResolvedValue("<p>mocked html</p>"),
}));

import {
  getAllProjectsMeta,
  getFeaturedProjects,
  getProjectBySlug,
  getProjectSlugs,
} from "./projects";

// ============================================================
// 测试数据
// ============================================================

const VALID_PROJECT_MD = `---
title: "Test Project"
slug: "test-project"
description: "A test project"
date: "2026-01-15"
tags: ["typescript", "testing"]
source: "https://github.com/test/project"
demo: "https://test-project.example.com"
featured: true
draft: false
---

# Test Project

Content here.
`;

const VALID_PROJECT_2_MD = `---
title: "Another Project"
slug: "another-project"
description: "Another one"
date: "2026-02-20"
tags: ["rust"]
featured: false
---

# Another Project
`;

const DRAFT_PROJECT_MD = `---
title: "Draft Project"
slug: "draft-project"
date: "2026-01-10"
draft: true
---

# Draft
`;

const NO_SLUG_PROJECT_MD = `---
title: "No Slug Project"
date: "2026-01-05"
---

# No Slug
`;

const INVALID_FRONTMATTER_MD = `---
invalid_field: true
---

# Invalid
`;

const MINIMAL_PROJECT_MD = `---
title: "Minimal"
---

# Minimal Project
`;

const TEST_LOCALE = "zh-CN";

describe("projects 数据层", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================
  // getAllProjectsMeta
  // ==========================================================
  describe("getAllProjectsMeta", () => {
    it("returns published project metadata by fixture slug", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "test-project.md",
        "another-project.md",
      ]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_PROJECT_MD)
        .mockReturnValueOnce(VALID_PROJECT_2_MD);

      const projects = getAllProjectsMeta(TEST_LOCALE);

      expect(
        projects.find((project) => project.slug === "test-project"),
      ).toMatchObject({ title: "Test Project", featured: true });
      expect(
        projects.find((project) => project.slug === "another-project"),
      ).toMatchObject({ title: "Another Project", featured: false });
    });

    it("过滤草稿项目", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-project.md", "draft-project.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_PROJECT_MD)
        .mockReturnValueOnce(DRAFT_PROJECT_MD);

      const projects = getAllProjectsMeta(TEST_LOCALE);

      expect(projects.some((project) => project.slug === "test-project")).toBe(
        true,
      );
      expect(projects.some((project) => project.slug === "draft-project")).toBe(
        false,
      );
    });

    it("跳过无效 frontmatter 的文件", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-project.md", "invalid.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_PROJECT_MD)
        .mockReturnValueOnce(INVALID_FRONTMATTER_MD);

      const projects = getAllProjectsMeta(TEST_LOCALE);

      expect(projects.some((project) => project.slug === "test-project")).toBe(
        true,
      );
      expect(projects.some((project) => project.slug === "invalid")).toBe(
        false,
      );
    });

    it("目录不存在时返回空数组", () => {
      mockExistsSync.mockReturnValue(false);

      const projects = getAllProjectsMeta(TEST_LOCALE);

      expect(projects).toEqual([]);
    });

    it("目录为空时返回空数组", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);

      const projects = getAllProjectsMeta(TEST_LOCALE);

      expect(projects).toEqual([]);
    });

    it("仅过滤 .md 后缀的文件", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "test-project.md",
        "notes.txt",
        "image.png",
      ]);
      mockReadFileSync.mockReturnValueOnce(VALID_PROJECT_MD);

      const projects = getAllProjectsMeta(TEST_LOCALE);

      expect(projects.some((project) => project.slug === "test-project")).toBe(
        true,
      );
    });

    it("使用 frontmatter 中的 slug 字段", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-project.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_PROJECT_MD);

      const projects = getAllProjectsMeta(TEST_LOCALE);

      expect(
        projects.find((project) => project.slug === "test-project"),
      ).toBeDefined();
    });

    it("frontmatter 无 slug 时使用文件名生成", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["no-slug-project.md"]);
      mockReadFileSync.mockReturnValueOnce(NO_SLUG_PROJECT_MD);

      const projects = getAllProjectsMeta(TEST_LOCALE);

      expect(
        projects.find((project) => project.slug === "no-slug-project"),
      ).toBeDefined();
    });

    it("does not invent optional project facts", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["minimal.md"]);
      mockReadFileSync.mockReturnValueOnce(MINIMAL_PROJECT_MD);

      const projects = getAllProjectsMeta(TEST_LOCALE);
      const project = projects.find((item) => item.slug === "minimal");

      expect(project).toMatchObject({
        date: "1970-01-01",
        tags: [],
        description: "",
        cover: null,
        source: null,
        demo: null,
        featured: false,
      });
      expect(project?.role).toBeUndefined();
      expect(project?.duration).toBeUndefined();
      expect(project?.result).toBeUndefined();
    });
  });

  // ==========================================================
  // getFeaturedProjects
  // ==========================================================
  describe("getFeaturedProjects", () => {
    it("返回 featured 为 true 的项目", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "test-project.md",
        "another-project.md",
      ]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_PROJECT_MD)
        .mockReturnValueOnce(VALID_PROJECT_2_MD);

      const featured = getFeaturedProjects(TEST_LOCALE);

      expect(featured.some((project) => project.slug === "test-project")).toBe(
        true,
      );
    });

    it("无 featured 项目时返回空数组", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["another-project.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_PROJECT_2_MD);

      const featured = getFeaturedProjects(TEST_LOCALE);

      expect(featured).toEqual([]);
    });

    it("目录不存在时返回空数组", () => {
      mockExistsSync.mockReturnValue(false);

      const featured = getFeaturedProjects(TEST_LOCALE);

      expect(featured).toEqual([]);
    });
  });

  // ==========================================================
  // getProjectSlugs
  // ==========================================================
  describe("getProjectSlugs", () => {
    it("返回所有已发布项目的 slug", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "test-project.md",
        "another-project.md",
      ]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_PROJECT_MD)
        .mockReturnValueOnce(VALID_PROJECT_2_MD);

      const slugs = getProjectSlugs(TEST_LOCALE);

      expect(slugs).toContain("test-project");
      expect(slugs).toContain("another-project");
    });

    it("过滤草稿项目的 slug", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-project.md", "draft-project.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_PROJECT_MD)
        .mockReturnValueOnce(DRAFT_PROJECT_MD);

      const slugs = getProjectSlugs(TEST_LOCALE);

      expect(slugs).toContain("test-project");
      expect(slugs).not.toContain("draft-project");
    });

    it("目录不存在时返回空数组", () => {
      mockExistsSync.mockReturnValue(false);

      const slugs = getProjectSlugs(TEST_LOCALE);

      expect(slugs).toEqual([]);
    });
  });

  // ==========================================================
  // getProjectBySlug
  // ==========================================================
  describe("getProjectBySlug", () => {
    it("根据 slug 返回对应项目", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-project.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_PROJECT_MD);

      const project = await getProjectBySlug("test-project", TEST_LOCALE);

      expect(project).not.toBeNull();
      expect(project!.title).toBe("Test Project");
      expect(project!.content).toBe("<p>mocked html</p>");
    });

    it("slug 不匹配时返回 null", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-project.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_PROJECT_MD);

      const project = await getProjectBySlug("non-existent", TEST_LOCALE);

      expect(project).toBeNull();
    });

    it("匹配的草稿项目返回 null", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["draft-project.md"]);
      mockReadFileSync.mockReturnValueOnce(DRAFT_PROJECT_MD);

      const project = await getProjectBySlug("draft-project", TEST_LOCALE);

      expect(project).toBeNull();
    });

    it("目录不存在时返回 null", async () => {
      mockExistsSync.mockReturnValue(false);

      const project = await getProjectBySlug("any-slug", TEST_LOCALE);

      expect(project).toBeNull();
    });

    it("使用文件名作为 fallback slug 匹配", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["no-slug-project.md"]);
      mockReadFileSync.mockReturnValueOnce(NO_SLUG_PROJECT_MD);

      const project = await getProjectBySlug("no-slug-project", TEST_LOCALE);

      expect(project).not.toBeNull();
      expect(project!.title).toBe("No Slug Project");
    });
  });
});
