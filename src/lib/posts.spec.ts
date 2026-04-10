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

import { markdownToHtml } from "./markdown";
import {
  getAllPostsMeta,
  getAllPosts,
  getPostBySlug,
  getAllTags,
  getAdjacentPosts,
} from "./posts";

// ============================================================
// 测试数据
// ============================================================

const TEST_LOCALE = "zh-CN";

const VALID_POST_MD = `---
title: "Test Post"
slug: "test-post"
date: "2026-01-15"
tags: ["typescript", "testing"]
summary: "A test post"
draft: false
---

# Test Post

This is the content.
`;

const VALID_POST_2_MD = `---
title: "Second Post"
slug: "second-post"
date: "2026-02-20"
updated: "2026-03-01"
tags: ["react"]
summary: "Second post summary"
---

# Second Post

Content here.
`;

const DRAFT_POST_MD = `---
title: "Draft Post"
slug: "draft-post"
date: "2026-01-10"
tags: ["draft"]
summary: "This is a draft"
draft: true
---

# Draft
`;

const NO_SLUG_POST_MD = `---
title: "No Slug Post"
date: "2026-01-05"
tags: []
summary: ""
---

# No Slug
`;

const INVALID_FRONTMATTER_MD = `---
invalid_field: true
---

# Invalid
`;

const MINIMAL_POST_MD = `---
title: "Minimal"
---

# Minimal Post
`;

describe("posts 数据层", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================
  // getAllPostsMeta
  // ==========================================================
  describe("getAllPostsMeta", () => {
    it("返回所有已发布文章的元信息", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md", "second-post.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_POST_MD)
        .mockReturnValueOnce(VALID_POST_2_MD);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts).toHaveLength(2);
      // 按日期降序：Second Post (2026-02-20) 在前
      expect(posts[0]!.title).toBe("Second Post");
      expect(posts[1]!.title).toBe("Test Post");
    });

    it("按日期降序排列", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["second-post.md", "test-post.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_POST_2_MD)
        .mockReturnValueOnce(VALID_POST_MD);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts[0]!.date).toBe("2026-02-20");
      expect(posts[1]!.date).toBe("2026-01-15");
    });

    it("过滤草稿文章", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md", "draft-post.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_POST_MD)
        .mockReturnValueOnce(DRAFT_POST_MD);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts).toHaveLength(1);
      expect(posts[0]!.slug).toBe("test-post");
    });

    it("跳过无效 frontmatter 的文件", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md", "invalid.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_POST_MD)
        .mockReturnValueOnce(INVALID_FRONTMATTER_MD);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts).toHaveLength(1);
      expect(posts[0]!.slug).toBe("test-post");
    });

    it("文章目录不存在时返回空数组", () => {
      mockExistsSync.mockReturnValue(false);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts).toEqual([]);
    });

    it("文章目录为空时返回空数组", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts).toEqual([]);
    });

    it("仅过滤 .md 后缀的文件", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        "test-post.md",
        "notes.txt",
        "image.png",
      ]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts).toHaveLength(1);
    });

    it("使用 frontmatter 中的 slug 字段", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts[0]!.slug).toBe("test-post");
    });

    it("frontmatter 无 slug 时使用文件名生成", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["no-slug-post.md"]);
      mockReadFileSync.mockReturnValueOnce(NO_SLUG_POST_MD);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts[0]!.slug).toBe("no-slug-post");
    });

    it("默认值填充：date 为 1970-01-01、tags 为空数组、summary 为空字符串", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["minimal.md"]);
      mockReadFileSync.mockReturnValueOnce(MINIMAL_POST_MD);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts[0]!.date).toBe("1970-01-01");
      expect(posts[0]!.tags).toEqual([]);
      expect(posts[0]!.summary).toBe("");
      expect(posts[0]!.cover).toBeNull();
    });

    it("updated 为空时回退到 date", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts[0]!.updated).toBe(posts[0]!.date);
    });

    it("updated 存在时使用 updated 值", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["second-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_2_MD);

      const posts = getAllPostsMeta(TEST_LOCALE);

      expect(posts[0]!.updated).toBe("2026-03-01");
    });

    it("readingTime is computed from raw content (no double I/O)", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      const posts = getAllPostsMeta(TEST_LOCALE);

      // Only one readFileSync call (no enrichment re-read)
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
      // Content has words, so readingTime should be > 0
      expect(posts[0]!.readingTime).toBeGreaterThan(0);
    });
  });

  // ==========================================================
  // getAllPosts
  // ==========================================================
  describe("getAllPosts", () => {
    it("返回所有已发布文章（含 HTML content）", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      const posts = await getAllPosts(TEST_LOCALE);

      expect(posts).toHaveLength(1);
      expect(posts[0]!.content).toBe("<p>mocked html</p>");
      expect(posts[0]!.title).toBe("Test Post");
    });

    it("调用 markdownToHtml 处理内容", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      await getAllPosts(TEST_LOCALE);

      expect(markdownToHtml).toHaveBeenCalled();
    });

    it("过滤草稿文章", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["draft-post.md"]);
      mockReadFileSync.mockReturnValueOnce(DRAFT_POST_MD);

      const posts = await getAllPosts(TEST_LOCALE);

      expect(posts).toHaveLength(0);
    });

    it("目录不存在时返回空数组", async () => {
      mockExistsSync.mockReturnValue(false);

      const posts = await getAllPosts(TEST_LOCALE);

      expect(posts).toEqual([]);
    });

    it("按日期降序排列", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md", "second-post.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_POST_MD)
        .mockReturnValueOnce(VALID_POST_2_MD);

      const posts = await getAllPosts(TEST_LOCALE);

      expect(posts[0]!.date).toBe("2026-02-20");
      expect(posts[1]!.date).toBe("2026-01-15");
    });

    it("readingTime is computed from raw content", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      const posts = await getAllPosts(TEST_LOCALE);

      expect(posts[0]!.readingTime).toBeGreaterThan(0);
    });
  });

  // ==========================================================
  // getPostBySlug
  // ==========================================================
  describe("getPostBySlug", () => {
    it("根据 slug 返回对应文章", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      const post = await getPostBySlug("test-post", TEST_LOCALE);

      expect(post).not.toBeNull();
      expect(post!.title).toBe("Test Post");
      expect(post!.content).toBe("<p>mocked html</p>");
    });

    it("slug 不匹配时返回 null", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      const post = await getPostBySlug("non-existent", TEST_LOCALE);

      expect(post).toBeNull();
    });

    it("匹配的草稿文章返回 null", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["draft-post.md"]);
      mockReadFileSync.mockReturnValueOnce(DRAFT_POST_MD);

      const post = await getPostBySlug("draft-project", TEST_LOCALE);

      expect(post).toBeNull();
    });

    it("目录不存在时返回 null", async () => {
      mockExistsSync.mockReturnValue(false);

      const post = await getPostBySlug("any-slug", TEST_LOCALE);

      expect(post).toBeNull();
    });

    it("使用文件名作为 fallback slug 进行匹配", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["no-slug-post.md"]);
      mockReadFileSync.mockReturnValueOnce(NO_SLUG_POST_MD);

      const post = await getPostBySlug("no-slug-post", TEST_LOCALE);

      expect(post).not.toBeNull();
      expect(post!.title).toBe("No Slug Post");
    });

    it("readingTime is computed from raw content (no double I/O)", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      const post = await getPostBySlug("test-post", TEST_LOCALE);

      // Only one readFileSync call (no enrichment re-read)
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
      expect(post!.readingTime).toBeGreaterThan(0);
    });
  });

  // ==========================================================
  // getAllTags
  // ==========================================================
  describe("getAllTags", () => {
    it("返回所有文章中出现过的标签（去重、排序）", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md", "second-post.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_POST_MD)
        .mockReturnValueOnce(VALID_POST_2_MD);

      const tags = getAllTags(TEST_LOCALE);

      expect(tags).toEqual(["react", "testing", "typescript"]);
    });

    it("无文章时返回空数组", () => {
      mockExistsSync.mockReturnValue(false);

      const tags = getAllTags(TEST_LOCALE);

      expect(tags).toEqual([]);
    });

    it("标签自动去重", () => {
      mockExistsSync.mockReturnValue(true);
      const postWithTagsA = `---
title: "Post A"
slug: "post-a"
date: "2026-01-01"
tags: ["common", "a"]
---
`;
      const postWithTagsB = `---
title: "Post B"
slug: "post-b"
date: "2026-01-02"
tags: ["common", "b"]
---
`;
      mockReaddirSync.mockReturnValue(["post-a.md", "post-b.md"]);
      mockReadFileSync
        .mockReturnValueOnce(postWithTagsA)
        .mockReturnValueOnce(postWithTagsB);

      const tags = getAllTags(TEST_LOCALE);

      expect(tags.filter((t) => t === "common")).toHaveLength(1);
    });
  });

  // ==========================================================
  // getAdjacentPosts
  // ==========================================================
  describe("getAdjacentPosts", () => {
    it("返回当前文章的上一篇和下一篇", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md", "second-post.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_POST_MD)
        .mockReturnValueOnce(VALID_POST_2_MD);

      // 降序排列：Second Post(index=0), Test Post(index=1)
      const adjacent = getAdjacentPosts("second-post", TEST_LOCALE);

      // second-post 在 index 0：prev=null(无更新), next=Test Post(更早的文章)
      expect(adjacent.prev).toBeNull();
      expect(adjacent.next).not.toBeNull();
      expect(adjacent.next!.slug).toBe("test-post");
    });

    it("最后一篇文章的 next 为 null", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md", "second-post.md"]);
      mockReadFileSync
        .mockReturnValueOnce(VALID_POST_MD)
        .mockReturnValueOnce(VALID_POST_2_MD);

      const adjacent = getAdjacentPosts("test-post", TEST_LOCALE);

      expect(adjacent.next).toBeNull();
      expect(adjacent.prev).not.toBeNull();
      expect(adjacent.prev!.slug).toBe("second-post");
    });

    it("slug 不存在时 prev 和 next 都为 null", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      const adjacent = getAdjacentPosts("non-existent", TEST_LOCALE);

      expect(adjacent.prev).toBeNull();
      expect(adjacent.next).toBeNull();
    });

    it("只有一篇文章时 prev 和 next 都为 null", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["test-post.md"]);
      mockReadFileSync.mockReturnValueOnce(VALID_POST_MD);

      const adjacent = getAdjacentPosts("test-post", TEST_LOCALE);

      expect(adjacent.prev).toBeNull();
      expect(adjacent.next).toBeNull();
    });

    it("目录不存在时 prev 和 next 都为 null", () => {
      mockExistsSync.mockReturnValue(false);

      const adjacent = getAdjacentPosts("any-slug", TEST_LOCALE);

      expect(adjacent.prev).toBeNull();
      expect(adjacent.next).toBeNull();
    });
  });
});
