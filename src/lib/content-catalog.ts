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
import type { Post } from "./posts";
import type { Project } from "./projects";

const CONTENT_LOCALE = "zh-CN";

export interface ContentCatalog {
  readonly posts: readonly Post[];
  readonly projects: readonly Project[];
  readonly postSlugs: readonly string[];
  readonly projectSlugs: readonly string[];
  readonly featuredProjects: readonly Project[];
  readonly tags: readonly string[];
  getPostBySlug(slug: string): Post | null;
  getProjectBySlug(slug: string): Project | null;
  getAdjacentPosts(slug: string): {
    readonly prev: Post | null;
    readonly next: Post | null;
  };
}

export interface ContentCatalogOptions {
  rootDir?: string;
  postsDir?: string;
  projectsDir?: string;
  publicDir?: string;
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
  projectsDir: string;
  publicDir: string;
}

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
  const rootDir = path.resolve(options.rootDir ?? process.cwd());

  return {
    rootDir,
    postsDir: path.resolve(
      options.postsDir ?? path.join(rootDir, "content/posts/zh-CN"),
    ),
    projectsDir: path.resolve(
      options.projectsDir ?? path.join(rootDir, "content/projects/zh-CN"),
    ),
    publicDir: path.resolve(options.publicDir ?? path.join(rootDir, "public")),
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

function publishedPosts(
  entries: readonly ValidatedContentEntry<PostFrontmatter>[],
): ValidatedContentEntry<PostFrontmatter>[] {
  return entries.filter((entry) => entry.frontmatter.draft === false);
}

function publishedProjects(
  entries: readonly ValidatedContentEntry<ProjectCaseFrontmatter>[],
): ValidatedContentEntry<ProjectCaseFrontmatter>[] {
  return entries.filter((entry) => entry.frontmatter.draft === false);
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
    tags: frontmatter.tags,
    summary: frontmatter.summary,
    cover: null,
    content,
    readingTime: estimateReadingTime(entry.body),
    locale: CONTENT_LOCALE,
  };
}

async function renderProject(
  entry: ValidatedContentEntry<ProjectCaseFrontmatter>,
): Promise<Project> {
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
    tags: frontmatter.tags,
    cover: frontmatter.cover,
    source: frontmatter.source ?? null,
    demo: frontmatter.demo ?? null,
    role: frontmatter.role,
    duration: frontmatter.duration,
    result: frontmatter.result,
    featured: frontmatter.featured,
    content,
    locale: CONTENT_LOCALE,
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

function freezePost(post: Post): Post {
  Object.freeze(post.tags);
  Object.freeze(post);
  return post;
}

function freezeProject(project: Project): Project {
  Object.freeze(project.tags);
  Object.freeze(project);
  return project;
}

function createCatalog(posts: Post[], projects: Project[]): ContentCatalog {
  const publishedPosts = Object.freeze(
    sortByDateDescending(posts).map(freezePost),
  );
  const publishedProjects = Object.freeze(
    sortByDateDescending(projects).map(freezeProject),
  );
  const postSlugs = Object.freeze(publishedPosts.map((post) => post.slug));
  const projectSlugs = Object.freeze(
    publishedProjects.map((project) => project.slug),
  );
  const featuredProjects = Object.freeze(
    publishedProjects.filter((project) => project.featured),
  );
  const tags = Object.freeze(
    Array.from(new Set(publishedPosts.flatMap((post) => post.tags))).sort(),
  );
  const postsBySlug = new Map(
    publishedPosts.map((post) => [post.slug, post] as const),
  );
  const projectsBySlug = new Map(
    publishedProjects.map((project) => [project.slug, project] as const),
  );

  return Object.freeze({
    posts: publishedPosts,
    projects: publishedProjects,
    postSlugs,
    projectSlugs,
    featuredProjects,
    tags,
    getPostBySlug(slug: string): Post | null {
      return postsBySlug.get(slug) ?? null;
    },
    getProjectBySlug(slug: string): Project | null {
      return projectsBySlug.get(slug) ?? null;
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
  const projectParsing = parseFiles(
    discoverMarkdownFiles(directories.projectsDir),
    directories.rootDir,
  );
  const postValidation = validatePostContracts(postParsing.inputs);
  const projectValidation = validateProjectCaseContracts(
    projectParsing.inputs,
    {
      publicDir: directories.publicDir,
    },
  );
  const errors = [
    ...postParsing.errors,
    ...postValidation.errors,
    ...projectParsing.errors,
    ...projectValidation.errors,
  ];

  if (errors.length > 0) {
    throw new ContentCatalogError(errors);
  }

  const posts = await Promise.all(
    publishedPosts(postValidation.entries).map(renderPost),
  );
  const projects = await Promise.all(
    publishedProjects(projectValidation.entries).map(renderProject),
  );

  return createCatalog(posts, projects);
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
