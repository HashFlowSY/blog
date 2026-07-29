import fs from "fs";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import {
  validatePostContracts,
  validateProjectCaseContracts,
} from "./content-contracts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

function createPublicDirectory(): string {
  const publicDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "blog-content-contracts-"),
  );
  const assetsDir = path.join(publicDir, "assets");
  fs.mkdirSync(assetsDir);
  fs.writeFileSync(path.join(assetsDir, "cover.png"), "cover asset");
  temporaryDirectories.push(publicDir);

  return publicDir;
}

function hasError(
  result: {
    errors: Array<{ filePath: string; field: string; reason: string }>;
  },
  filePath: string,
  field: string,
): boolean {
  return result.errors.some(
    (error) => error.filePath === filePath && error.field === field,
  );
}

describe("strict content contracts", () => {
  const publishedPost = {
    title: "Strict Post",
    slug: "strict-post",
    date: "2026-03-12",
    tags: [" TypeScript ", "Testing"],
    summary: "A complete published post.",
    draft: false,
  };

  describe("Post drafts", () => {
    it("allows an explicit draft to omit publication fields and Markdown body", () => {
      const result = validatePostContracts([
        {
          filePath: "content/posts/zh-CN/idea.md",
          frontmatter: { draft: true },
          body: "",
        },
      ]);

      expect(result.errors).toEqual([]);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]?.frontmatter).toEqual({ draft: true });
    });

    it("rejects supplied fields that do not satisfy their format", () => {
      const filePath = "content/posts/zh-CN/invalid-draft.md";
      const result = validatePostContracts([
        {
          filePath,
          frontmatter: {
            draft: true,
            date: "2026-02-30",
            slug: "Not a slug",
            title: 42,
          },
          body: "",
        },
      ]);

      expect(hasError(result, filePath, "title")).toBe(true);
      expect(hasError(result, filePath, "slug")).toBe(true);
      expect(hasError(result, filePath, "date")).toBe(true);
    });

    it("rejects unknown Post frontmatter fields", () => {
      const filePath = "content/posts/zh-CN/with-cover.md";
      const result = validatePostContracts([
        {
          filePath,
          frontmatter: { draft: true, cover: "/assets/cover.png" },
          body: "",
        },
      ]);

      expect(hasError(result, filePath, "cover")).toBe(true);
    });
  });

  describe("published Posts", () => {
    it("accepts every required field and normalizes display tags without changing case", () => {
      const result = validatePostContracts([
        {
          filePath: "content/posts/zh-CN/strict-post.md",
          frontmatter: publishedPost,
          body: "# Strict Post",
        },
      ]);

      expect(result.errors).toEqual([]);
      expect(result.entries[0]?.frontmatter).toMatchObject({
        ...publishedPost,
        tags: ["TypeScript", "Testing"],
      });
    });

    it("never treats a missing draft state as published", () => {
      const filePath = "content/posts/zh-CN/no-draft-state.md";
      const { draft: _draft, ...frontmatter } = publishedPost;
      const result = validatePostContracts([
        { filePath, frontmatter, body: "# Post body" },
      ]);

      expect(result.entries).toEqual([]);
      expect(hasError(result, filePath, "draft")).toBe(true);
    });

    it("requires every publication field and a Markdown body", () => {
      const filePath = "content/posts/zh-CN/incomplete.md";
      const result = validatePostContracts([
        { filePath, frontmatter: { draft: false }, body: " \n" },
      ]);

      for (const field of [
        "title",
        "slug",
        "date",
        "tags",
        "summary",
        "body",
      ]) {
        expect(hasError(result, filePath, field)).toBe(true);
      }
    });

    it("rejects invalid date values and an updated date before date", () => {
      const invalidCalendarFile = "content/posts/zh-CN/invalid-calendar.md";
      const invalidFormatFile = "content/posts/zh-CN/invalid-format.md";
      const earlierUpdatedFile = "content/posts/zh-CN/earlier-updated.md";
      const result = validatePostContracts([
        {
          filePath: invalidCalendarFile,
          frontmatter: { ...publishedPost, date: "2026-02-30" },
          body: "# Post body",
        },
        {
          filePath: invalidFormatFile,
          frontmatter: { ...publishedPost, date: "2026/03/12" },
          body: "# Post body",
        },
        {
          filePath: earlierUpdatedFile,
          frontmatter: { ...publishedPost, updated: "2026-03-11" },
          body: "# Post body",
        },
      ]);

      expect(hasError(result, invalidCalendarFile, "date")).toBe(true);
      expect(hasError(result, invalidFormatFile, "date")).toBe(true);
      expect(hasError(result, earlierUpdatedFile, "updated")).toBe(true);
    });

    it("reports an outdated updated value alongside unrelated schema errors", () => {
      const filePath = "content/posts/zh-CN/multiple-errors.md";
      const result = validatePostContracts([
        {
          filePath,
          frontmatter: {
            ...publishedPost,
            title: 42,
            updated: "2026-03-11",
          },
          body: "# Post body",
        },
      ]);

      expect(hasError(result, filePath, "title")).toBe(true);
      expect(hasError(result, filePath, "updated")).toBe(true);
    });

    it("rejects blank or duplicate tags and invalid field types", () => {
      const blankTagFile = "content/posts/zh-CN/blank-tag.md";
      const duplicateTagFile = "content/posts/zh-CN/duplicate-tag.md";
      const wrongTypeFile = "content/posts/zh-CN/wrong-type.md";
      const result = validatePostContracts([
        {
          filePath: blankTagFile,
          frontmatter: { ...publishedPost, tags: [" "] },
          body: "# Post body",
        },
        {
          filePath: duplicateTagFile,
          frontmatter: {
            ...publishedPost,
            tags: ["TypeScript", " TypeScript "],
          },
          body: "# Post body",
        },
        {
          filePath: wrongTypeFile,
          frontmatter: { ...publishedPost, tags: "TypeScript" },
          body: "# Post body",
        },
      ]);

      expect(hasError(result, blankTagFile, "tags.0")).toBe(true);
      expect(hasError(result, duplicateTagFile, "tags.1")).toBe(true);
      expect(hasError(result, wrongTypeFile, "tags")).toBe(true);
    });

    it("rejects invalid slugs, post covers, and other unknown keys", () => {
      const invalidSlugFile = "content/posts/zh-CN/invalid-slug.md";
      const coverFile = "content/posts/zh-CN/cover.md";
      const unknownKeyFile = "content/posts/zh-CN/unknown-key.md";
      const result = validatePostContracts([
        {
          filePath: invalidSlugFile,
          frontmatter: { ...publishedPost, slug: "Strict Post" },
          body: "# Post body",
        },
        {
          filePath: coverFile,
          frontmatter: { ...publishedPost, cover: "/assets/cover.png" },
          body: "# Post body",
        },
        {
          filePath: unknownKeyFile,
          frontmatter: { ...publishedPost, audience: "everyone" },
          body: "# Post body",
        },
      ]);

      expect(hasError(result, invalidSlugFile, "slug")).toBe(true);
      expect(hasError(result, coverFile, "cover")).toBe(true);
      expect(hasError(result, unknownKeyFile, "audience")).toBe(true);
    });

    it("reports duplicate slugs for every file in the collection", () => {
      const firstFile = "content/posts/zh-CN/first.md";
      const secondFile = "content/posts/zh-CN/second.md";
      const result = validatePostContracts([
        { filePath: firstFile, frontmatter: publishedPost, body: "# First" },
        { filePath: secondFile, frontmatter: publishedPost, body: "# Second" },
      ]);

      expect(hasError(result, firstFile, "slug")).toBe(true);
      expect(hasError(result, secondFile, "slug")).toBe(true);
      expect(result.errors.every((error) => error.reason.length > 0)).toBe(
        true,
      );
    });
  });

  describe("Project Case drafts", () => {
    it("allows an explicit draft to omit publication fields and body", () => {
      const result = validateProjectCaseContracts([
        {
          filePath: "content/projects/zh-CN/idea.md",
          frontmatter: { draft: true },
          body: "",
        },
      ]);

      expect(result.errors).toEqual([]);
      expect(result.entries[0]?.frontmatter).toEqual({ draft: true });
    });

    it("rejects invalid fields that an explicit draft does provide", () => {
      const publicDir = createPublicDirectory();
      const filePath = "content/projects/zh-CN/invalid-draft.md";
      const result = validateProjectCaseContracts(
        [
          {
            filePath,
            frontmatter: {
              draft: true,
              cover: "assets/cover.png",
              featured: "yes",
            },
            body: "",
          },
        ],
        { publicDir },
      );

      expect(hasError(result, filePath, "cover")).toBe(true);
      expect(hasError(result, filePath, "featured")).toBe(true);
    });
  });

  describe("published Project Cases", () => {
    function publishedProject() {
      return {
        title: "Strict Project",
        slug: "strict-project",
        date: "2026-03-12",
        tags: ["TypeScript", "Next.js"],
        description: "A complete public Project Case.",
        cover: "/assets/cover.png",
        role: "Design and development",
        duration: "Six weeks",
        result: "A verified result.",
        source: "https://github.com/example/strict-project",
        demo: "https://example.com/strict-project",
        featured: true,
        draft: false,
      };
    }

    it("accepts a complete Project Case with an existing local cover", () => {
      const publicDir = createPublicDirectory();
      const result = validateProjectCaseContracts(
        [
          {
            filePath: "content/projects/zh-CN/strict-project.md",
            frontmatter: publishedProject(),
            body: "# Strict Project",
          },
        ],
        { publicDir },
      );

      expect(result.errors).toEqual([]);
      expect(result.entries).toHaveLength(1);
    });

    it("requires explicit draft and featured states and every publication field", () => {
      const publicDir = createPublicDirectory();
      const filePath = "content/projects/zh-CN/incomplete.md";
      const result = validateProjectCaseContracts(
        [{ filePath, frontmatter: { draft: false }, body: "" }],
        { publicDir },
      );

      for (const field of [
        "title",
        "slug",
        "date",
        "tags",
        "description",
        "cover",
        "role",
        "duration",
        "result",
        "featured",
        "body",
      ]) {
        expect(hasError(result, filePath, field)).toBe(true);
      }
    });

    it("does not infer a state when draft or featured is missing", () => {
      const publicDir = createPublicDirectory();
      const missingDraftFile = "content/projects/zh-CN/no-draft.md";
      const missingFeaturedFile = "content/projects/zh-CN/no-featured.md";
      const project = publishedProject();
      const { draft: _draft, ...withoutDraft } = project;
      const { featured: _featured, ...withoutFeatured } = project;
      const result = validateProjectCaseContracts(
        [
          {
            filePath: missingDraftFile,
            frontmatter: withoutDraft,
            body: "# Project body",
          },
          {
            filePath: missingFeaturedFile,
            frontmatter: withoutFeatured,
            body: "# Project body",
          },
        ],
        { publicDir },
      );

      expect(hasError(result, missingDraftFile, "draft")).toBe(true);
      expect(hasError(result, missingFeaturedFile, "featured")).toBe(true);
    });

    it("rejects missing, relative, non-existent, and escaping covers", () => {
      const publicDir = createPublicDirectory();
      const missingCoverFile = "content/projects/zh-CN/missing-cover.md";
      const relativeCoverFile = "content/projects/zh-CN/relative-cover.md";
      const missingFileCover = "content/projects/zh-CN/missing-file.md";
      const escapingCoverFile = "content/projects/zh-CN/escaping-cover.md";
      const { cover: _cover, ...withoutCover } = publishedProject();
      const result = validateProjectCaseContracts(
        [
          {
            filePath: missingCoverFile,
            frontmatter: withoutCover,
            body: "# Project body",
          },
          {
            filePath: relativeCoverFile,
            frontmatter: { ...publishedProject(), cover: "assets/cover.png" },
            body: "# Project body",
          },
          {
            filePath: missingFileCover,
            frontmatter: {
              ...publishedProject(),
              cover: "/assets/missing.png",
            },
            body: "# Project body",
          },
          {
            filePath: escapingCoverFile,
            frontmatter: { ...publishedProject(), cover: "/../outside.png" },
            body: "# Project body",
          },
        ],
        { publicDir },
      );

      expect(hasError(result, missingCoverFile, "cover")).toBe(true);
      expect(hasError(result, relativeCoverFile, "cover")).toBe(true);
      expect(hasError(result, missingFileCover, "cover")).toBe(true);
      expect(hasError(result, escapingCoverFile, "cover")).toBe(true);
    });

    it("rejects HTTP, relative, and unsafe external URLs", () => {
      const publicDir = createPublicDirectory();
      const httpFile = "content/projects/zh-CN/http.md";
      const relativeFile = "content/projects/zh-CN/relative.md";
      const unsafeFile = "content/projects/zh-CN/unsafe.md";
      const result = validateProjectCaseContracts(
        [
          {
            filePath: httpFile,
            frontmatter: {
              ...publishedProject(),
              source: "http://example.com",
            },
            body: "# Project body",
          },
          {
            filePath: relativeFile,
            frontmatter: { ...publishedProject(), demo: "/demo" },
            body: "# Project body",
          },
          {
            filePath: unsafeFile,
            frontmatter: {
              ...publishedProject(),
              source: "javascript:alert('unsafe')",
            },
            body: "# Project body",
          },
        ],
        { publicDir },
      );

      expect(hasError(result, httpFile, "source")).toBe(true);
      expect(hasError(result, relativeFile, "demo")).toBe(true);
      expect(hasError(result, unsafeFile, "source")).toBe(true);
    });

    it("rejects public template state, invalid types, and duplicate slugs", () => {
      const publicDir = createPublicDirectory();
      const templateFile = "content/projects/zh-CN/template.md";
      const wrongTypeFile = "content/projects/zh-CN/wrong-type.md";
      const firstDuplicateFile = "content/projects/zh-CN/first.md";
      const secondDuplicateFile = "content/projects/zh-CN/second.md";
      const result = validateProjectCaseContracts(
        [
          {
            filePath: templateFile,
            frontmatter: { ...publishedProject(), template: false },
            body: "# Project body",
          },
          {
            filePath: wrongTypeFile,
            frontmatter: { ...publishedProject(), featured: "true" },
            body: "# Project body",
          },
          {
            filePath: firstDuplicateFile,
            frontmatter: publishedProject(),
            body: "# First project",
          },
          {
            filePath: secondDuplicateFile,
            frontmatter: publishedProject(),
            body: "# Second project",
          },
        ],
        { publicDir },
      );

      expect(hasError(result, templateFile, "template")).toBe(true);
      expect(hasError(result, wrongTypeFile, "featured")).toBe(true);
      expect(hasError(result, firstDuplicateFile, "slug")).toBe(true);
      expect(hasError(result, secondDuplicateFile, "slug")).toBe(true);
    });
  });
});
