import fs from "fs";
import path from "path";

import {
  validatePostContracts,
  validateProjectCaseContracts,
} from "./content-contracts";
import { compileMarkdownDocuments } from "./markdown/compile";
import { readMarkdownSource } from "./markdown/frontmatter";
import { BASE_PATH } from "./site";

import type {
  ContentValidationError,
  PublishedPostFrontmatter,
  PublishedProjectCaseFrontmatter,
  ValidatedContentEntry,
} from "./content-contracts";
import type { CompiledDocument } from "./markdown/model";

export interface Post {
  slug: string;
  title: string;
  date: string;
  updated: string;
  tags: NonEmptyTags;
  summary: string;
  document: CompiledDocument;
}

export type PostCardMeta = Pick<
  Post,
  "slug" | "title" | "date" | "tags" | "summary"
> & { readingMinutes: number };

export function postCardMeta({
  slug,
  title,
  date,
  tags,
  summary,
  document,
}: Post): PostCardMeta {
  return {
    slug,
    title,
    date,
    tags,
    summary,
    readingMinutes: document.readingStats.minutes,
  };
}

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
  evidence?: Readonly<{ label: string; url: string }>;
  featured: boolean;
  document: CompiledDocument;
}

export type ProjectCaseMeta = Omit<ProjectCase, "document">;

export interface ContentCatalog {
  readonly posts: readonly Post[];
  readonly projectCases: readonly ProjectCase[];
  readonly postSlugs: readonly string[];
  readonly projectCaseSlugs: readonly string[];
  readonly featuredProjectCases: readonly ProjectCase[];
  readonly tags: readonly string[];
  getPostBySlug(slug: string): Post | null;
  getProjectCaseBySlug(slug: string): ProjectCase | null;
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
  inputs: ReturnType<typeof readMarkdownSource>[];
  errors: ContentValidationError[];
}

function parseFiles(files: readonly string[], rootDir: string): ParsedFiles {
  const inputs: ParsedFiles["inputs"] = [];
  const errors: ContentValidationError[] = [];

  for (const filePath of files) {
    const displayPath = path.relative(rootDir, filePath);

    try {
      inputs.push(readMarkdownSource(displayPath, fs.readFileSync(filePath)));
    } catch (error: unknown) {
      errors.push({
        filePath: displayPath,
        field: "frontmatter",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { inputs, errors };
}

function isPublished<TFrontmatter extends { draft: boolean }>(
  entry: ValidatedContentEntry<TFrontmatter>,
): entry is ValidatedContentEntry<Extract<TFrontmatter, { draft: false }>> {
  return entry.frontmatter.draft === false;
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

function createPost(
  frontmatter: PublishedPostFrontmatter,
  document: CompiledDocument,
): Post {
  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    date: frontmatter.date,
    updated: frontmatter.updated ?? frontmatter.date,
    tags: toNonEmptyTags(frontmatter.tags),
    summary: frontmatter.summary,
    document,
  };
}

function createProjectCase(
  frontmatter: PublishedProjectCaseFrontmatter,
  document: CompiledDocument,
): ProjectCase {
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
    ...(frontmatter.evidence
      ? { evidence: Object.freeze({ ...frontmatter.evidence }) }
      : {}),
    featured: frontmatter.featured,
    document,
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

  const publishedPosts = postValidation.entries.filter(isPublished);
  const publishedCases = projectCaseValidation.entries.filter(isPublished);
  const positions = new Map(
    [...postParsing.inputs, ...projectCaseParsing.inputs].map(
      ({ filePath, bodyLine }) => [filePath, bodyLine] as const,
    ),
  );
  const documents = await compileMarkdownDocuments(
    [...publishedPosts, ...publishedCases].map(
      ({ filePath, body, frontmatter }) => ({
        filePath,
        body,
        title: frontmatter.title,
        bodyLine: requireEntry(positions, filePath),
      }),
    ),
    { basePath: BASE_PATH },
  );
  return createCatalog(
    publishedPosts.map(({ frontmatter, filePath }) =>
      createPost(frontmatter, requireEntry(documents, filePath)),
    ),
    publishedCases.map(({ frontmatter, filePath }) =>
      createProjectCase(frontmatter, requireEntry(documents, filePath)),
    ),
  );
}

function requireEntry<T>(entries: ReadonlyMap<string, T>, filePath: string): T {
  const entry = entries.get(filePath);
  if (entry === undefined)
    throw new Error(`Missing content entry for ${filePath}.`);
  return entry;
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
