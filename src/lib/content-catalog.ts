import fs from "fs";
import path from "path";

import matter from "gray-matter";

import {
  validatePostContracts,
  validateProjectCaseContracts,
} from "./content-contracts";
import { markdownToHtml } from "./markdown";
import { estimateReadingTime } from "./reading-time";

import type {
  ContentContractInput,
  ContentValidationError,
  PostFrontmatter,
  ProjectCaseFrontmatter,
  ValidatedContentEntry,
} from "./content-contracts";

export interface Post {
  slug: string;
  title: string;
  date: string;
  updated: string;
  tags: NonEmptyTags;
  summary: string;
  content: string;
  readingTime: number;
}

export type PostMeta = Omit<Post, "content">;

export type NonEmptyTags = readonly [string, ...string[]];

export interface ProjectCase {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: NonEmptyTags;
  cover: string;
  source: string | null;
  demo: string | null;
  role: string;
  duration: string;
  result: string;
  featured: boolean;
  content: string;
}

export type ProjectCaseMeta = Omit<ProjectCase, "content">;

export interface ContentCatalog {
  readonly posts: readonly Post[];
  readonly projectCases: readonly ProjectCase[];
  readonly postSlugs: readonly string[];
  readonly projectCaseSlugs: readonly string[];
  readonly featuredProjectCases: readonly ProjectCase[];
  readonly tags: readonly string[];
  getPostBySlug(slug: string): Post | null;
  getProjectCaseBySlug(slug: string): ProjectCase | null;
  getAdjacentPosts(slug: string): {
    readonly prev: Post | null;
    readonly next: Post | null;
  };
}

export interface ContentCatalogOptions {
  rootDir?: string;
}

export type ContentCatalogCacheMode = "development" | "production";

export interface ContentCatalogReaderOptions extends ContentCatalogOptions {
  cacheMode?: ContentCatalogCacheMode;
}

export interface ContentCatalogReader {
  getCatalog(): Promise<ContentCatalog>;
}

export class ContentCatalogError extends Error {
  readonly errors: readonly ContentValidationError[];

  constructor(errors: readonly ContentValidationError[]) {
    const stableErrors = freezeErrors(errors);
    super(
      [
        "Content Catalog validation failed:",
        ...stableErrors.map(
          (error) => `- ${error.filePath} [${error.field}]: ${error.reason}`,
        ),
      ].join("\n"),
    );
    this.name = "ContentCatalogError";
    this.errors = stableErrors;
  }
}

interface ContentDirectories {
  rootDir: string;
  postsDir: string;
  projectCasesDir: string;
  publicDir: string;
}

const defaultContentDirectories: ContentDirectories = {
  rootDir: process.cwd(),
  postsDir: path.join(process.cwd(), "content/posts/zh-CN"),
  projectCasesDir: path.join(process.cwd(), "content/projects/zh-CN"),
  publicDir: path.join(process.cwd(), "public"),
};

function freezeErrors(
  errors: readonly ContentValidationError[],
): readonly ContentValidationError[] {
  const stableErrors = [...errors]
    .sort(
      (left, right) =>
        left.filePath.localeCompare(right.filePath) ||
        left.field.localeCompare(right.field) ||
        left.reason.localeCompare(right.reason),
    )
    .map((error) => Object.freeze({ ...error }) as ContentValidationError);

  return Object.freeze(stableErrors);
}

function resolveDirectories(
  options: ContentCatalogOptions,
): ContentDirectories {
  if (options.rootDir === undefined) {
    return defaultContentDirectories;
  }

  const rootDir = path.resolve(/* turbopackIgnore: true */ options.rootDir);

  return {
    rootDir,
    postsDir: path.join(
      /* turbopackIgnore: true */ rootDir,
      "content/posts/zh-CN",
    ),
    projectCasesDir: path.join(
      /* turbopackIgnore: true */ rootDir,
      "content/projects/zh-CN",
    ),
    publicDir: path.join(/* turbopackIgnore: true */ rootDir, "public"),
  };
}

function discoverMarkdownFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

interface ParsedFiles {
  inputs: ContentContractInput[];
  errors: ContentValidationError[];
}

function parseFiles(files: readonly string[], rootDir: string): ParsedFiles {
  const inputs: ContentContractInput[] = [];
  const errors: ContentValidationError[] = [];

  for (const filePath of files) {
    const displayPath = path.relative(rootDir, filePath);

    try {
      const parsed = matter(fs.readFileSync(filePath, "utf8"));
      inputs.push({
        filePath: displayPath,
        frontmatter: parsed.data,
        body: parsed.content,
      });
    } catch {
      errors.push({
        filePath: displayPath,
        field: "frontmatter",
        reason: "Invalid YAML frontmatter.",
      });
    }
  }

  return { inputs, errors };
}

function publishedEntries<TFrontmatter extends { draft: boolean }>(
  entries: readonly ValidatedContentEntry<TFrontmatter>[],
): ValidatedContentEntry<TFrontmatter>[] {
  return entries.filter((entry) => entry.frontmatter.draft === false);
}

function toNonEmptyTags(tags: readonly string[]): NonEmptyTags {
  const [firstTag, ...remainingTags] = tags;

  if (firstTag === undefined) {
    throw new Error(
      "Cannot render published content without at least one tag.",
    );
  }

  return [firstTag, ...remainingTags];
}

async function renderPost(
  entry: ValidatedContentEntry<PostFrontmatter>,
): Promise<Post> {
  if (entry.frontmatter.draft) {
    throw new Error("Cannot render a Draft as a published Post.");
  }

  const frontmatter = entry.frontmatter;
  const content = await markdownToHtml(entry.body, entry.filePath);

  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    date: frontmatter.date,
    updated: frontmatter.updated ?? frontmatter.date,
    tags: toNonEmptyTags(frontmatter.tags),
    summary: frontmatter.summary,
    content,
    readingTime: estimateReadingTime(entry.body),
  };
}

async function renderProjectCase(
  entry: ValidatedContentEntry<ProjectCaseFrontmatter>,
): Promise<ProjectCase> {
  if (entry.frontmatter.draft) {
    throw new Error("Cannot render a Draft as a published Project Case.");
  }

  const frontmatter = entry.frontmatter;
  const content = await markdownToHtml(entry.body, entry.filePath);

  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    description: frontmatter.description,
    date: frontmatter.date,
    tags: toNonEmptyTags(frontmatter.tags),
    cover: frontmatter.cover,
    source: frontmatter.source ?? null,
    demo: frontmatter.demo ?? null,
    role: frontmatter.role,
    duration: frontmatter.duration,
    result: frontmatter.result,
    featured: frontmatter.featured,
    content,
  };
}

function sortByDateDescending<T extends { date: string; slug: string }>(
  entries: T[],
): T[] {
  return entries.sort(
    (left, right) =>
      right.date.localeCompare(left.date) ||
      left.slug.localeCompare(right.slug),
  );
}

function freezeSortedEntries<
  TEntry extends { date: string; slug: string; tags: readonly string[] },
>(entries: TEntry[]): readonly TEntry[] {
  return Object.freeze(
    sortByDateDescending(entries).map((entry) => {
      Object.freeze(entry.tags);
      Object.freeze(entry);
      return entry;
    }),
  );
}

function createCatalog(
  posts: Post[],
  projectCases: ProjectCase[],
): ContentCatalog {
  const publishedPosts = freezeSortedEntries(posts);
  const publishedProjectCases = freezeSortedEntries(projectCases);
  const postSlugs = Object.freeze(publishedPosts.map((post) => post.slug));
  const projectCaseSlugs = Object.freeze(
    publishedProjectCases.map((projectCase) => projectCase.slug),
  );
  const featuredProjectCases = Object.freeze(
    publishedProjectCases.filter((projectCase) => projectCase.featured),
  );
  const tags = Object.freeze(
    Array.from(new Set(publishedPosts.flatMap((post) => post.tags))).sort(),
  );
  const postsBySlug = new Map(
    publishedPosts.map((post) => [post.slug, post] as const),
  );
  const projectCasesBySlug = new Map(
    publishedProjectCases.map(
      (projectCase) => [projectCase.slug, projectCase] as const,
    ),
  );

  return Object.freeze({
    posts: publishedPosts,
    projectCases: publishedProjectCases,
    postSlugs,
    projectCaseSlugs,
    featuredProjectCases,
    tags,
    getPostBySlug(slug: string): Post | null {
      return postsBySlug.get(slug) ?? null;
    },
    getProjectCaseBySlug(slug: string): ProjectCase | null {
      return projectCasesBySlug.get(slug) ?? null;
    },
    getAdjacentPosts(slug: string) {
      const index = postSlugs.indexOf(slug);

      return Object.freeze({
        prev: index > 0 ? (publishedPosts[index - 1] ?? null) : null,
        next:
          index >= 0 && index < publishedPosts.length - 1
            ? (publishedPosts[index + 1] ?? null)
            : null,
      });
    },
  });
}

export async function buildContentCatalog(
  options: ContentCatalogOptions = {},
): Promise<ContentCatalog> {
  const directories = resolveDirectories(options);
  const postParsing = parseFiles(
    discoverMarkdownFiles(directories.postsDir),
    directories.rootDir,
  );
  const projectCaseParsing = parseFiles(
    discoverMarkdownFiles(directories.projectCasesDir),
    directories.rootDir,
  );
  const postValidation = validatePostContracts(postParsing.inputs);
  const projectCaseValidation = validateProjectCaseContracts(
    projectCaseParsing.inputs,
    {
      publicDir: directories.publicDir,
    },
  );
  const errors = [
    ...postParsing.errors,
    ...postValidation.errors,
    ...projectCaseParsing.errors,
    ...projectCaseValidation.errors,
  ];

  if (errors.length > 0) {
    throw new ContentCatalogError(errors);
  }

  const posts = await Promise.all(
    publishedEntries(postValidation.entries).map(renderPost),
  );
  const projectCases = await Promise.all(
    publishedEntries(projectCaseValidation.entries).map(renderProjectCase),
  );

  return createCatalog(posts, projectCases);
}

export function createContentCatalogReader(
  options: ContentCatalogReaderOptions = {},
): ContentCatalogReader {
  const cacheMode =
    options.cacheMode ??
    (process.env.NODE_ENV === "production" ? "production" : "development");
  let cachedCatalog: Promise<ContentCatalog> | null = null;

  return Object.freeze({
    getCatalog(): Promise<ContentCatalog> {
      if (cacheMode === "development") {
        return buildContentCatalog(options);
      }

      if (!cachedCatalog) {
        const nextCatalog = buildContentCatalog(options);
        cachedCatalog = nextCatalog;
        void nextCatalog.catch(() => {
          if (cachedCatalog === nextCatalog) {
            cachedCatalog = null;
          }
        });
      }

      return cachedCatalog;
    },
  });
}

const defaultContentCatalogReader = createContentCatalogReader();

export function getContentCatalog(): Promise<ContentCatalog> {
  return defaultContentCatalogReader.getCatalog();
}
