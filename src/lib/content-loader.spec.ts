import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// vi.hoisted — define mocks before vi.mock hoisting
// ============================================================

const { mockReaddirSync, mockReadFileSync, mockExistsSync, mockConsoleWarn } =
  vi.hoisted(() => ({
    mockReaddirSync: vi.fn<(dir: string) => string[]>(),
    mockReadFileSync: vi.fn<(filePath: string, encoding: string) => string>(),
    mockExistsSync: vi.fn<(dir: string) => boolean>(),
    mockConsoleWarn: vi.fn<(message: string) => void>(),
  }));

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
  markdownToHtml: vi.fn().mockResolvedValue("<p>rendered</p>"),
}));

import { z } from "zod";

import { createContentLoader } from "./content-loader";

// ============================================================
// Test schema & data
// ============================================================

const testSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  date: z.string().optional().default("1970-01-01"),
  tags: z.array(z.string()).optional().default([]),
  draft: z.boolean().optional().default(false),
});

type TestFrontmatter = z.infer<typeof testSchema>;

interface TestMeta {
  slug: string;
  title: string;
  date: string;
  rawContent: string;
}

interface TestFull {
  slug: string;
  title: string;
  date: string;
  html: string;
  rawContent: string;
}

const CONTENT_DIR = "/test-content";

function createLoader() {
  return createContentLoader<typeof testSchema, TestMeta, TestFull>({
    contentDir: CONTENT_DIR,
    schema: testSchema,
    slugField: "slug",
    draftField: "draft",
    sortField: "date",
    logLabel: "[test]",
    toMeta(data: TestFrontmatter, slug: string, rawContent: string): TestMeta {
      return { slug, title: data.title, date: data.date, rawContent };
    },
    toFull(
      data: TestFrontmatter,
      slug: string,
      html: string,
      rawContent: string,
    ): TestFull {
      return { slug, title: data.title, date: data.date, html, rawContent };
    },
  });
}

const FILE_A = `---
title: "Post A"
slug: "post-a"
date: "2026-03-01"
tags: ["ts"]
draft: false
---

Hello world from Post A.
`;

const FILE_B = `---
title: "Post B"
slug: "post-b"
date: "2026-01-15"
tags: ["react"]
draft: false
---

Hello world from Post B.
`;

const FILE_C_DRAFT = `---
title: "Draft C"
slug: "draft-c"
date: "2026-02-01"
draft: true
---

Draft content.
`;

const FILE_D_NO_SLUG = `---
title: "No Slug Post"
date: "2026-04-01"
---

Content without slug.
`;

const FILE_E_INVALID = `---
not_a_valid_field: 123
---

Bad frontmatter.
`;

const FILE_F_MINIMAL = `---
title: "Minimal"
---

Minimal content.
`;

describe("createContentLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(mockConsoleWarn);
  });

  // ==========================================================
  // getAllMeta
  // ==========================================================
  describe("getAllMeta", () => {
    it("returns all non-draft items sorted by date desc", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["a.md", "b.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_A).mockReturnValueOnce(FILE_B);

      const loader = createLoader();
      const results = loader.getAllMeta();

      expect(results).toHaveLength(2);
      // Post A (2026-03-01) before Post B (2026-01-15)
      expect(results[0]!.slug).toBe("post-a");
      expect(results[1]!.slug).toBe("post-b");
    });

    it("filters out draft items", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["a.md", "c.md"]);
      mockReadFileSync
        .mockReturnValueOnce(FILE_A)
        .mockReturnValueOnce(FILE_C_DRAFT);

      const loader = createLoader();
      const results = loader.getAllMeta();

      expect(results).toHaveLength(1);
      expect(results[0]!.slug).toBe("post-a");
    });

    it("skips files with invalid frontmatter", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["a.md", "e.md"]);
      mockReadFileSync
        .mockReturnValueOnce(FILE_A)
        .mockReturnValueOnce(FILE_E_INVALID);

      const loader = createLoader();
      const results = loader.getAllMeta();

      expect(results).toHaveLength(1);
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    });

    it("returns empty array when content directory does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const loader = createLoader();
      const results = loader.getAllMeta();

      expect(results).toEqual([]);
    });

    it("returns empty array for empty directory", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);

      const loader = createLoader();
      const results = loader.getAllMeta();

      expect(results).toEqual([]);
    });

    it("uses frontmatter slug when present", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["a.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_A);

      const loader = createLoader();
      const results = loader.getAllMeta();

      expect(results[0]!.slug).toBe("post-a");
    });

    it("falls back to filename when slug is missing", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["d.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_D_NO_SLUG);

      const loader = createLoader();
      const results = loader.getAllMeta();

      expect(results[0]!.slug).toBe("d");
    });

    it("applies default values from schema", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["f.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_F_MINIMAL);

      const loader = createLoader();
      const results = loader.getAllMeta();

      expect(results[0]!.date).toBe("1970-01-01");
      expect(results[0]!.title).toBe("Minimal");
    });

    it("passes raw content to toMeta callback", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["a.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_A);

      const loader = createLoader();
      const results = loader.getAllMeta();

      // rawContent should contain the markdown body after frontmatter strip
      expect(results[0]!.rawContent).toContain("Hello world from Post A.");
      expect(results[0]!.rawContent).not.toContain("title:");
    });

    it("only processes .md files", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["a.md", "readme.txt", "image.png"]);
      mockReadFileSync.mockReturnValueOnce(FILE_A);

      const loader = createLoader();
      const results = loader.getAllMeta();

      expect(results).toHaveLength(1);
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================
  // getAllFull
  // ==========================================================
  describe("getAllFull", () => {
    it("returns all non-draft items with rendered HTML sorted by date desc", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["a.md", "b.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_A).mockReturnValueOnce(FILE_B);

      const loader = createLoader();
      const results = await loader.getAllFull();

      expect(results).toHaveLength(2);
      expect(results[0]!.slug).toBe("post-a");
      expect(results[0]!.html).toBe("<p>rendered</p>");
      expect(results[1]!.slug).toBe("post-b");
    });

    it("filters out drafts", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["c.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_C_DRAFT);

      const loader = createLoader();
      const results = await loader.getAllFull();

      expect(results).toHaveLength(0);
    });

    it("passes raw content to toFull callback", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["a.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_A);

      const loader = createLoader();
      const results = await loader.getAllFull();

      expect(results[0]!.rawContent).toContain("Hello world from Post A.");
    });

    it("returns empty array when directory does not exist", async () => {
      mockExistsSync.mockReturnValue(false);

      const loader = createLoader();
      const results = await loader.getAllFull();

      expect(results).toEqual([]);
    });
  });

  // ==========================================================
  // getBySlug
  // ==========================================================
  describe("getBySlug", () => {
    it("returns matching non-draft item with HTML", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["a.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_A);

      const loader = createLoader();
      const result = await loader.getBySlug("post-a");

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Post A");
      expect(result!.html).toBe("<p>rendered</p>");
    });

    it("returns null for non-existent slug", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["a.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_A);

      const loader = createLoader();
      const result = await loader.getBySlug("non-existent");

      expect(result).toBeNull();
    });

    it("returns null for draft items", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["c.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_C_DRAFT);

      const loader = createLoader();
      const result = await loader.getBySlug("draft-c");

      expect(result).toBeNull();
    });

    it("matches by filename when slug is missing in frontmatter", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["d.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_D_NO_SLUG);

      const loader = createLoader();
      const result = await loader.getBySlug("d");

      expect(result).not.toBeNull();
      expect(result!.title).toBe("No Slug Post");
    });

    it("returns null when directory does not exist", async () => {
      mockExistsSync.mockReturnValue(false);

      const loader = createLoader();
      const result = await loader.getBySlug("any");

      expect(result).toBeNull();
    });

    it("passes raw content to toFull callback", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["a.md"]);
      mockReadFileSync.mockReturnValueOnce(FILE_A);

      const loader = createLoader();
      const result = await loader.getBySlug("post-a");

      expect(result!.rawContent).toContain("Hello world from Post A.");
    });
  });
});
