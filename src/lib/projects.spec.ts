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

describe("projects 数据层", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================
  // getAllProjectsMeta
  // ==========================================================
  describe("getAllProjectsMeta", () => {
    it("返回所有已发布项目元信息", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "test-project.md",
        "another-project.md",
      ]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_PROJECT_MD)
        .mockReturnValueOnce(VALID_PROJECT_2_MD);

      const projects = getAllProjectsMeta();

      expect(projects).toHaveLength(2);
      expect(projects[0]!.title).toBe("Another Project");
      expect(projects[1]!.title).toBe("Test Project");
    });

    it("按日期降序排列", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "test-project.md",
        "another-project.md",
      ]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_PROJECT_MD)
        .mockReturnValueOnce(VALID_PROJECT_2_MD);

      const projects = getAllProjectsMeta();

      expect(projects[0]!.date).toBe("2026-02-20");
      expect(projects[1]!.date).toBe("2026-01-15");
    });

    it("过滤草稿项目", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-project.md", "draft-project.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_PROJECT_MD)
        .mockReturnValueOnce(DRAFT_PROJECT_MD);

      const projects = getAllProjectsMeta();

      expect(projects).toHaveLength(1);
      expect(projects[0]!.slug).toBe("test-project");
    });

    it("跳过无效 frontmatter 的文件", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-project.md", "invalid.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_PROJECT_MD)
        .mockReturnValueOnce(INVALID_FRONTMATTER_MD);

      const projects = getAllProjectsMeta();

      expect(projects).toHaveLength(1);
      expect(projects[0]!.slug).toBe("test-project");
    });

    it("目录不存在时返回空数组", () => {
      mockExistsSync.mockReturnValue(false);

      const projects = getAllProjectsMeta();

      expect(projects).toEqual([]);
    });

    it("目录为空时返回空数组", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);

      const projects = getAllProjectsMeta();

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

      const projects = getAllProjectsMeta();

      expect(projects).toHaveLength(1);
    });

    it("使用 frontmatter 中的 slug 字段", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-project.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_PROJECT_MD);

      const projects = getAllProjectsMeta();

      expect(projects[0]!.slug).toBe("test-project");
    });

    it("frontmatter 无 slug 时使用文件名生成", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["no-slug-project.md"]);
      mockReadFileSync.mockReturnValueOnce(NO_SLUG_PROJECT_MD);

      const projects = getAllProjectsMeta();

      expect(projects[0]!.slug).toBe("no-slug-project");
    });

    it("应用默认值", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["minimal.md"]);
      mockReadFileSync.mockReturnValueOnce(MINIMAL_PROJECT_MD);

      const projects = getAllProjectsMeta();

      expect(projects[0]!.date).toBe("1970-01-01");
      expect(projects[0]!.tags).toEqual([]);
      expect(projects[0]!.description).toBe("");
      expect(projects[0]!.cover).toBeNull();
      expect(projects[0]!.source).toBeNull();
      expect(projects[0]!.demo).toBeNull();
      expect(projects[0]!.featured).toBe(false);
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

      const featured = getFeaturedProjects();

      expect(featured).toHaveLength(1);
      expect(featured[0]!.slug).toBe("test-project");
    });

    it("无 featured 项目时返回空数组", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["another-project.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_PROJECT_2_MD);

      const featured = getFeaturedProjects();

      expect(featured).toEqual([]);
    });

    it("目录不存在时返回空数组", () => {
      mockExistsSync.mockReturnValue(false);

      const featured = getFeaturedProjects();

      expect(featured).toEqual([]);
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

      const project = await getProjectBySlug("test-project");

      expect(project).not.toBeNull();
      expect(project!.title).toBe("Test Project");
      expect(project!.content).toBe("<p>mocked html</p>");
    });

    it("slug 不匹配时返回 null", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-project.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_PROJECT_MD);

      const project = await getProjectBySlug("non-existent");

      expect(project).toBeNull();
    });

    it("匹配的草稿项目返回 null", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["draft-project.md"]);
      mockReadFileSync.mockReturnValueOnce(DRAFT_PROJECT_MD);

      const project = await getProjectBySlug("draft-project");

      expect(project).toBeNull();
    });

    it("目录不存在时返回 null", async () => {
      mockExistsSync.mockReturnValue(false);

      const project = await getProjectBySlug("any-slug");

      expect(project).toBeNull();
    });

    it("使用文件名作为 fallback slug 匹配", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["no-slug-project.md"]);
      mockReadFileSync.mockReturnValueOnce(NO_SLUG_PROJECT_MD);

      const project = await getProjectBySlug("no-slug-project");

      expect(project).not.toBeNull();
      expect(project!.title).toBe("No Slug Project");
    });
  });
});
