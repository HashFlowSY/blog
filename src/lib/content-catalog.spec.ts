import fs from "fs";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildContentCatalog,
  ContentCatalogError,
  createContentCatalogReader,
  type ContentCatalogOptions,
  type Post,
  type ProjectCase,
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
  const projectCasesDir = path.join(rootDir, "content/projects/zh-CN");
  const assetsDir = path.join(rootDir, "public/assets");

  fs.mkdirSync(postsDir, { recursive: true });
  fs.mkdirSync(projectCasesDir, { recursive: true });
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

function writeProjectCase(
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
  it("exports only complete Published entry contracts", () => {
    type PostExposesCover = "cover" extends keyof Post ? true : false;
    type PostExposesLegacyContent = "content" extends keyof Post ? true : false;
    type PostRenderedContentIsOptional =
      object extends Pick<Post, "renderedContent"> ? true : false;
    type ProjectCaseCoverAllowsNull = null extends ProjectCase["cover"]
      ? true
      : false;
    type ProjectCaseExposesLegacyContent = "content" extends keyof ProjectCase
      ? true
      : false;
    type ProjectCaseRoleIsOptional =
      object extends Pick<ProjectCase, "role"> ? true : false;
    type ProjectCaseDurationIsOptional =
      object extends Pick<ProjectCase, "duration"> ? true : false;
    type ProjectCaseResultIsOptional =
      object extends Pick<ProjectCase, "result"> ? true : false;
    type PostTagsAllowEmpty = [] extends Post["tags"] ? true : false;
    type ProjectCaseTagsAllowEmpty = [] extends ProjectCase["tags"]
      ? true
      : false;

    // @ts-expect-error Published Posts never expose a cover field.
    const postExposesCover: PostExposesCover = true;
    // @ts-expect-error Published Posts expose a structured rendered result instead of legacy HTML content.
    const postExposesLegacyContent: PostExposesLegacyContent = true;
    // @ts-expect-error Published Posts always have a structured rendered result.
    const postRenderedContentIsOptional: PostRenderedContentIsOptional = true;
    // @ts-expect-error Published Project Case covers are always present.
    const projectCaseCoverAllowsNull: ProjectCaseCoverAllowsNull = true;
    // @ts-expect-error Published Project Cases expose a structured rendered result instead of legacy HTML content.
    const projectCaseExposesLegacyContent: ProjectCaseExposesLegacyContent = true;
    // @ts-expect-error Published Project Case roles are always present.
    const projectCaseRoleIsOptional: ProjectCaseRoleIsOptional = true;
    // @ts-expect-error Published Project Case durations are always present.
    const projectCaseDurationIsOptional: ProjectCaseDurationIsOptional = true;
    // @ts-expect-error Published Project Case results are always present.
    const projectCaseResultIsOptional: ProjectCaseResultIsOptional = true;
    // @ts-expect-error Published Posts always have at least one tag.
    const postTagsAllowEmpty: PostTagsAllowEmpty = true;
    // @ts-expect-error Published Project Cases always have at least one tag.
    const projectCaseTagsAllowEmpty: ProjectCaseTagsAllowEmpty = true;

    void postExposesCover;
    void postExposesLegacyContent;
    void postRenderedContentIsOptional;
    void projectCaseCoverAllowsNull;
    void projectCaseExposesLegacyContent;
    void projectCaseRoleIsOptional;
    void projectCaseDurationIsOptional;
    void projectCaseResultIsOptional;
    void postTagsAllowEmpty;
    void projectCaseTagsAllowEmpty;
  });

  it("keeps collection paths internal to the Catalog API", () => {
    const rootOnlyOptions: ContentCatalogOptions = { rootDir: "/fixture" };

    expect(rootOnlyOptions).toEqual({ rootDir: "/fixture" });

    // @ts-expect-error Collection paths are derived from the Catalog root.
    const invalidPostsOption: ContentCatalogOptions = { postsDir: "." };
    // @ts-expect-error Collection paths are derived from the Catalog root.
    const badProjects: ContentCatalogOptions = { projectsDir: "." };
    // @ts-expect-error Collection paths are derived from the Catalog root.
    const invalidPublicOption: ContentCatalogOptions = { publicDir: "." };

    void invalidPostsOption;
    void badProjects;
    void invalidPublicOption;
  });

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
    writeProjectCase(rootDir, "catalog-project.md", completeProjectFrontmatter);

    const catalog = await buildContentCatalog({ rootDir });

    expect(catalog.posts.map((post) => post.slug)).toEqual([
      "newer-post",
      "older-post",
    ]);
    expect(catalog.projectCases.map((projectCase) => projectCase.slug)).toEqual(
      ["catalog-project"],
    );
    expect(catalog.posts[0]).not.toHaveProperty("cover");
    expect(catalog.projectCases[0]).toMatchObject({
      cover: "/assets/project.png",
      role: "Development",
      duration: "Two weeks",
      result: "Published successfully.",
    });
    expect(catalog.posts[0]).not.toHaveProperty("locale");
    expect(catalog.projectCases[0]).not.toHaveProperty("locale");
  });

  it("stores immutable structured Markdown results for Posts and Project Cases", async () => {
    const rootDir = createFixtureRoot();
    writePost(
      rootDir,
      "structured-post.md",
      `title: "Structured Post"
slug: "structured-post"
date: "2026-05-04"
tags: ["Catalog"]
summary: "A structured Markdown result."
draft: false`,
      "# Structured Post\n\n## Post section",
    );
    writeProjectCase(
      rootDir,
      "structured-project.md",
      completeProjectFrontmatter,
      "# Catalog Project\n\n## Project section",
    );

    const catalog = await buildContentCatalog({ rootDir });
    const post = catalog.getPostBySlug("structured-post");
    const projectCase = catalog.getProjectCaseBySlug("catalog-project");

    expect(post).not.toBeNull();
    expect(projectCase).not.toBeNull();
    expect(post!.renderedContent).toMatchObject({
      headings: [{ id: expect.any(String), level: 2, text: "Post section" }],
    });
    expect(post!.renderedContent.html).not.toContain("<h1");
    expect(projectCase!.renderedContent).toMatchObject({
      headings: [{ id: expect.any(String), level: 2, text: "Project section" }],
    });
    expect(projectCase!.renderedContent.html).not.toContain("<h1");
    expect(Object.isFrozen(post!.renderedContent)).toBe(true);
    expect(Object.isFrozen(post!.renderedContent.headings)).toBe(true);
    expect(Object.isFrozen(post!.renderedContent.headings[0])).toBe(true);
    expect(() => {
      (
        post!.renderedContent.headings as unknown as {
          push: (heading: unknown) => void;
        }
      ).push({ id: "changed", level: 2, text: "Changed" });
    }).toThrow();
    expect(() => {
      (post!.renderedContent.headings[0] as unknown as { text: string }).text =
        "Changed";
    }).toThrow();
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

    writeProjectCase(
      rootDir,
      "missing.md",
      completeProjectFrontmatter.replace(
        'cover: "/assets/project.png"',
        'cover: "/assets/missing.png"',
      ),
    );
    writeProjectCase(
      rootDir,
      "traversal.md",
      completeProjectFrontmatter
        .replace('slug: "catalog-project"', 'slug: "traversal-project"')
        .replace(
          'cover: "/assets/project.png"',
          'cover: "/../outside/cover.png"',
        ),
    );
    writeProjectCase(
      rootDir,
      "absolute.md",
      completeProjectFrontmatter
        .replace('slug: "catalog-project"', 'slug: "absolute-project"')
        .replace(
          'cover: "/assets/project.png"',
          `cover: "${path.join(outsideDir, "cover.png")}"`,
        ),
    );
    writeProjectCase(
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
    writeProjectCase(rootDir, "catalog-project.md", completeProjectFrontmatter);

    const catalog = await buildContentCatalog({ rootDir });

    expect(catalog.postSlugs).toEqual(["newer-post", "older-post"]);
    expect(catalog.projectCaseSlugs).toEqual(["catalog-project"]);
    expect(catalog.getPostBySlug("newer-post")?.title).toBe("Newer Post");
    expect(catalog.getPostBySlug("unpublished-idea")).toBeNull();
    expect(catalog.getProjectCaseBySlug("catalog-project")?.featured).toBe(
      true,
    );
    expect(
      catalog.featuredProjectCases.map((projectCase) => projectCase.slug),
    ).toEqual(["catalog-project"]);
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
    writeProjectCase(
      rootDir,
      "duplicate-project-one.md",
      completeProjectFrontmatter.replace(
        'slug: "catalog-project"',
        'slug: "same-project"',
      ),
    );
    writeProjectCase(
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

  it("retries a failed production snapshot after invalid content is fixed", async () => {
    const rootDir = createFixtureRoot();
    writePost(
      rootDir,
      "retry.md",
      `title: "Needs a slug before publishing"
date: "2026-06-01"
tags: ["Testing"]
summary: "The first production build must fail."
draft: false`,
    );
    const production = createContentCatalogReader({
      rootDir,
      cacheMode: "production",
    });

    await expect(production.getCatalog()).rejects.toBeInstanceOf(
      ContentCatalogError,
    );

    writePost(
      rootDir,
      "retry.md",
      `title: "Recovered post"
slug: "recovered-post"
date: "2026-06-01"
tags: ["Testing"]
summary: "The corrected production build succeeds."
draft: false`,
    );

    const recoveredCatalog = await production.getCatalog();
    const reusedCatalog = await production.getCatalog();

    expect(recoveredCatalog.postSlugs).toEqual(["recovered-post"]);
    expect(reusedCatalog).toBe(recoveredCatalog);
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
