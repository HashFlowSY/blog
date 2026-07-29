import fs from "fs";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildContentCatalog,
  ContentCatalogError,
  createContentCatalogReader,
} from "./content-catalog";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

function createFixtureRoot(): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-catalog-"));
  const postsDir = path.join(rootDir, "content/posts/zh-CN");
  const projectsDir = path.join(rootDir, "content/projects/zh-CN");
  const assetsDir = path.join(rootDir, "public/assets");

  fs.mkdirSync(postsDir, { recursive: true });
  fs.mkdirSync(projectsDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, "project.png"), "project cover");
  temporaryDirectories.push(rootDir);

  return rootDir;
}

function writePost(
  rootDir: string,
  fileName: string,
  frontmatter: string,
  body = "## 正文\n\n这是一篇完整文章。",
): void {
  fs.writeFileSync(
    path.join(rootDir, "content/posts/zh-CN", fileName),
    `---\n${frontmatter}\n---\n\n${body}\n`,
  );
}

function writeProject(
  rootDir: string,
  fileName: string,
  frontmatter: string,
  body = "## 项目说明\n\n这是一个完整的项目案例。",
): void {
  fs.writeFileSync(
    path.join(rootDir, "content/projects/zh-CN", fileName),
    `---\n${frontmatter}\n---\n\n${body}\n`,
  );
}

const completeProjectFrontmatter = `title: "Catalog Project"
slug: "catalog-project"
date: "2026-04-02"
tags: ["Next.js", "TypeScript"]
description: "A complete Project Case."
cover: "/assets/project.png"
role: "Development"
duration: "Two weeks"
result: "Published successfully."
featured: true
draft: false`;

describe("Content Catalog", () => {
  it("builds one published snapshot from representative Post and Project Case files", async () => {
    const rootDir = createFixtureRoot();
    writePost(
      rootDir,
      "older.md",
      `title: "Older Post"
slug: "older-post"
date: "2026-01-04"
tags: ["Testing"]
summary: "The older entry."
draft: false`,
    );
    writePost(
      rootDir,
      "newer.md",
      `title: "Newer Post"
slug: "newer-post"
date: "2026-05-04"
tags: ["Catalog"]
summary: "The newer entry."
draft: false`,
    );
    writePost(rootDir, "idea.md", "draft: true", "");
    writeProject(rootDir, "catalog-project.md", completeProjectFrontmatter);

    const catalog = await buildContentCatalog({ rootDir });

    expect(catalog.posts.map((post) => post.slug)).toEqual([
      "newer-post",
      "older-post",
    ]);
    expect(catalog.projects.map((project) => project.slug)).toEqual([
      "catalog-project",
    ]);
  });

  it("reports malformed YAML and every strict field error together instead of returning a partial Catalog", async () => {
    const rootDir = createFixtureRoot();
    fs.writeFileSync(
      path.join(rootDir, "content/posts/zh-CN/malformed.md"),
      "---\ntitle: [broken\n---\n\nThis frontmatter is malformed.\n",
    );
    writePost(
      rootDir,
      "many-errors.md",
      `title: 42
slug: "Not A Slug"
date: "2026-02-30"
tags: []
summary: ""
draft: false
unexpected: true`,
      "",
    );
    writePost(
      rootDir,
      "otherwise-valid.md",
      `title: "Would be partial"
slug: "would-be-partial"
date: "2026-03-04"
tags: ["Testing"]
summary: "This entry must not be exposed on its own."
draft: false`,
    );

    const failure = await buildContentCatalog({ rootDir }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ContentCatalogError);
    expect((failure as ContentCatalogError).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: "content/posts/zh-CN/malformed.md",
          field: "frontmatter",
          reason: "Invalid YAML frontmatter.",
        }),
        expect.objectContaining({
          filePath: "content/posts/zh-CN/many-errors.md",
          field: "title",
        }),
        expect.objectContaining({
          filePath: "content/posts/zh-CN/many-errors.md",
          field: "slug",
        }),
        expect.objectContaining({
          filePath: "content/posts/zh-CN/many-errors.md",
          field: "unexpected",
        }),
        expect.objectContaining({
          filePath: "content/posts/zh-CN/many-errors.md",
          field: "body",
        }),
      ]),
    );
  });

  it("rejects every missing, absolute, traversing, and symlink-escaping Project Case cover in one filesystem scan", async () => {
    const rootDir = createFixtureRoot();
    const outsideDir = path.join(rootDir, "outside");
    fs.mkdirSync(outsideDir);
    fs.writeFileSync(path.join(outsideDir, "cover.png"), "outside cover");
    fs.symlinkSync(
      path.join(outsideDir, "cover.png"),
      path.join(rootDir, "public/assets/escape.png"),
    );

    writeProject(
      rootDir,
      "missing.md",
      completeProjectFrontmatter.replace(
        'cover: "/assets/project.png"',
        'cover: "/assets/missing.png"',
      ),
    );
    writeProject(
      rootDir,
      "traversal.md",
      completeProjectFrontmatter
        .replace('slug: "catalog-project"', 'slug: "traversal-project"')
        .replace(
          'cover: "/assets/project.png"',
          'cover: "/../outside/cover.png"',
        ),
    );
    writeProject(
      rootDir,
      "absolute.md",
      completeProjectFrontmatter
        .replace('slug: "catalog-project"', 'slug: "absolute-project"')
        .replace(
          'cover: "/assets/project.png"',
          `cover: "${path.join(outsideDir, "cover.png")}"`,
        ),
    );
    writeProject(
      rootDir,
      "symlink.md",
      completeProjectFrontmatter
        .replace('slug: "catalog-project"', 'slug: "symlink-project"')
        .replace('cover: "/assets/project.png"', 'cover: "/assets/escape.png"'),
    );

    const failure = await buildContentCatalog({ rootDir }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ContentCatalogError);
    expect((failure as ContentCatalogError).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: "content/projects/zh-CN/missing.md",
          field: "cover",
          reason: "Referenced file does not exist inside public/.",
        }),
        expect.objectContaining({
          filePath: "content/projects/zh-CN/traversal.md",
          field: "cover",
          reason: "Must resolve inside public/ without path traversal.",
        }),
        expect.objectContaining({
          filePath: "content/projects/zh-CN/absolute.md",
          field: "cover",
          reason: "Referenced file does not exist inside public/.",
        }),
        expect.objectContaining({
          filePath: "content/projects/zh-CN/symlink.md",
          field: "cover",
          reason:
            "Must resolve inside public/ without following a path outside it.",
        }),
      ]),
    );
  });

  it("exposes immutable published collection, slug, tag, featured, and adjacency queries from one snapshot", async () => {
    const rootDir = createFixtureRoot();
    writePost(
      rootDir,
      "older.md",
      `title: "Older Post"
slug: "older-post"
date: "2026-01-04"
tags: ["Testing", "Shared"]
summary: "The older entry."
draft: false`,
    );
    writePost(
      rootDir,
      "newer.md",
      `title: "Newer Post"
slug: "newer-post"
date: "2026-05-04"
tags: ["Catalog", "Shared"]
summary: "The newer entry."
draft: false`,
    );
    writePost(rootDir, "unpublished-idea.md", "draft: true", "");
    writeProject(rootDir, "catalog-project.md", completeProjectFrontmatter);

    const catalog = await buildContentCatalog({ rootDir });

    expect(catalog.postSlugs).toEqual(["newer-post", "older-post"]);
    expect(catalog.projectSlugs).toEqual(["catalog-project"]);
    expect(catalog.getPostBySlug("newer-post")?.title).toBe("Newer Post");
    expect(catalog.getPostBySlug("unpublished-idea")).toBeNull();
    expect(catalog.getProjectBySlug("catalog-project")?.featured).toBe(true);
    expect(catalog.featuredProjects.map((project) => project.slug)).toEqual([
      "catalog-project",
    ]);
    expect(catalog.tags).toEqual(["Catalog", "Shared", "Testing"]);
    expect(catalog.getAdjacentPosts("newer-post")).toMatchObject({
      prev: null,
      next: { slug: "older-post" },
    });
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog.posts)).toBe(true);
    expect(Object.isFrozen(catalog.posts[0]?.tags)).toBe(true);
    expect(() => {
      (catalog.posts as unknown as { push: (entry: unknown) => void }).push({});
    }).toThrow();
  });

  it("fails closed for missing, invalid, and duplicate explicit slugs within their collections", async () => {
    const rootDir = createFixtureRoot();
    writePost(
      rootDir,
      "missing-slug.md",
      `title: "Missing slug"
date: "2026-03-01"
tags: ["Testing"]
summary: "Explicit slugs are required."
draft: false`,
    );
    writePost(
      rootDir,
      "invalid-slug.md",
      `title: "Invalid slug"
slug: "Not A Stable Slug"
date: "2026-03-02"
tags: ["Testing"]
summary: "This must fail instead of using the filename."
draft: false`,
    );
    writePost(
      rootDir,
      "duplicate-one.md",
      `title: "First duplicate"
slug: "same-post"
date: "2026-03-03"
tags: ["Testing"]
summary: "The first duplicate."
draft: false`,
    );
    writePost(
      rootDir,
      "duplicate-two.md",
      `title: "Second duplicate"
slug: "same-post"
date: "2026-03-04"
tags: ["Testing"]
summary: "The second duplicate."
draft: false`,
    );
    writeProject(
      rootDir,
      "duplicate-project-one.md",
      completeProjectFrontmatter.replace(
        'slug: "catalog-project"',
        'slug: "same-project"',
      ),
    );
    writeProject(
      rootDir,
      "duplicate-project-two.md",
      completeProjectFrontmatter
        .replace('title: "Catalog Project"', 'title: "Another Project"')
        .replace('slug: "catalog-project"', 'slug: "same-project"'),
    );

    const failure = await buildContentCatalog({ rootDir }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ContentCatalogError);
    expect((failure as ContentCatalogError).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: "content/posts/zh-CN/missing-slug.md",
          field: "slug",
        }),
        expect.objectContaining({
          filePath: "content/posts/zh-CN/invalid-slug.md",
          field: "slug",
        }),
        expect.objectContaining({
          filePath: "content/posts/zh-CN/duplicate-one.md",
          field: "slug",
          reason: expect.stringContaining("must be unique"),
        }),
        expect.objectContaining({
          filePath: "content/posts/zh-CN/duplicate-two.md",
          field: "slug",
          reason: expect.stringContaining("must be unique"),
        }),
        expect.objectContaining({
          filePath: "content/projects/zh-CN/duplicate-project-one.md",
          field: "slug",
          reason: expect.stringContaining("must be unique"),
        }),
        expect.objectContaining({
          filePath: "content/projects/zh-CN/duplicate-project-two.md",
          field: "slug",
          reason: expect.stringContaining("must be unique"),
        }),
      ]),
    );
  });

  it("rebuilds after development edits, additions, and deletions while production reuses one verified snapshot", async () => {
    const rootDir = createFixtureRoot();
    const firstPost = `title: "Initial title"
slug: "first-post"
date: "2026-03-01"
tags: ["Testing"]
summary: "The initial entry."
draft: false`;
    writePost(rootDir, "first.md", firstPost);

    const development = createContentCatalogReader({
      rootDir,
      cacheMode: "development",
    });
    const initialDevelopmentCatalog = await development.getCatalog();
    writePost(
      rootDir,
      "first.md",
      firstPost.replace("Initial title", "Edited title"),
    );
    const editedDevelopmentCatalog = await development.getCatalog();
    writePost(
      rootDir,
      "second.md",
      `title: "Added title"
slug: "second-post"
date: "2026-04-01"
tags: ["Catalog"]
summary: "The added entry."
draft: false`,
    );
    const addedDevelopmentCatalog = await development.getCatalog();
    fs.rmSync(path.join(rootDir, "content/posts/zh-CN/first.md"));
    const deletedDevelopmentCatalog = await development.getCatalog();

    expect(initialDevelopmentCatalog.getPostBySlug("first-post")?.title).toBe(
      "Initial title",
    );
    expect(editedDevelopmentCatalog.getPostBySlug("first-post")?.title).toBe(
      "Edited title",
    );
    expect(addedDevelopmentCatalog.postSlugs).toEqual([
      "second-post",
      "first-post",
    ]);
    expect(deletedDevelopmentCatalog.postSlugs).toEqual(["second-post"]);

    const production = createContentCatalogReader({
      rootDir,
      cacheMode: "production",
    });
    const firstProductionCatalog = await production.getCatalog();
    writePost(
      rootDir,
      "third.md",
      `title: "Not visible in the cached build"
slug: "third-post"
date: "2026-05-01"
tags: ["Catalog"]
summary: "This is written after the production snapshot."
draft: false`,
    );
    const secondProductionCatalog = await production.getCatalog();

    expect(secondProductionCatalog).toBe(firstProductionCatalog);
    expect(secondProductionCatalog.postSlugs).toEqual(["second-post"]);
  });

  it("formats every aggregate error in a stable, readable order", async () => {
    const rootDir = createFixtureRoot();
    writePost(
      rootDir,
      "a-schema-error.md",
      `slug: "missing-title"
date: "2026-03-01"
tags: ["Testing"]
summary: "The title is intentionally absent."
draft: false`,
    );
    fs.writeFileSync(
      path.join(rootDir, "content/posts/zh-CN/z-yaml-error.md"),
      "---\ntitle: [invalid\n---\n\nMalformed YAML.\n",
    );

    const failure = await buildContentCatalog({ rootDir }).catch(
      (error: unknown) => error,
    );
    const catalogError = failure as ContentCatalogError;

    expect(catalogError).toBeInstanceOf(ContentCatalogError);
    expect(
      catalogError.errors.map((error) => `${error.filePath}:${error.field}`),
    ).toEqual([
      "content/posts/zh-CN/a-schema-error.md:title",
      "content/posts/zh-CN/z-yaml-error.md:frontmatter",
    ]);
    expect(catalogError.message).toContain(
      "- content/posts/zh-CN/a-schema-error.md [title]:",
    );
    expect(catalogError.message).toContain(
      "- content/posts/zh-CN/z-yaml-error.md [frontmatter]: Invalid YAML frontmatter.",
    );
    expect(catalogError.message).not.toContain("ZodError");
  });

  it("parses valid Drafts without publishing them and rejects invalid Draft fields", async () => {
    const rootDir = createFixtureRoot();
    writePost(rootDir, "valid-draft.md", "draft: true", "");

    const catalog = await buildContentCatalog({ rootDir });

    expect(catalog.posts).toEqual([]);
    expect(catalog.postSlugs).toEqual([]);

    writePost(
      rootDir,
      "invalid-draft.md",
      `draft: true
unknown: "not permitted"`,
      "",
    );
    const failure = await buildContentCatalog({ rootDir }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ContentCatalogError);
    expect((failure as ContentCatalogError).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: "content/posts/zh-CN/invalid-draft.md",
          field: "unknown",
          reason: "Unknown frontmatter field.",
        }),
      ]),
    );
  });
});
