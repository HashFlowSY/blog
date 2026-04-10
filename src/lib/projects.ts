import path from "path";

import { z } from "zod";

import { createContentLoader } from "./content-loader";

import type { ContentLoader } from "./content-loader";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const PROJECTS_BASE_DIR = path.join(process.cwd(), "content/projects");

const projectFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().default(""),
  date: z.string().optional().default("1970-01-01"),
  tags: z.array(z.string()).optional().default([]),
  cover: z.string().optional().nullable().default(null),
  source: z.string().optional().nullable().default(null),
  demo: z.string().optional().nullable().default(null),
  featured: z.boolean().optional().default(false),
  draft: z.boolean().optional().default(false),
});

type ProjectFrontmatter = z.infer<typeof projectFrontmatterSchema>;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface Project {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  cover: string | null;
  source: string | null;
  demo: string | null;
  featured: boolean;
  content: string;
  locale: string;
}

export interface ProjectMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  cover: string | null;
  source: string | null;
  demo: string | null;
  featured: boolean;
  locale: string;
}

// ---------------------------------------------------------------------------
// Per-locale content loaders
// ---------------------------------------------------------------------------

function createProjectsLoader(
  locale: string,
): ContentLoader<ProjectMeta, Project> {
  const contentDir = path.join(PROJECTS_BASE_DIR, locale);

  return createContentLoader({
    contentDir,
    schema: projectFrontmatterSchema,
    slugField: "slug",
    draftField: "draft",
    sortField: "date",
    logLabel: `[projects/${locale}]`,
    toMeta(
      data: ProjectFrontmatter,
      slug: string,
      _rawContent: string,
    ): ProjectMeta {
      return {
        slug,
        title: data.title,
        description: data.description,
        date: data.date,
        tags: data.tags,
        cover: data.cover,
        source: data.source,
        demo: data.demo,
        featured: data.featured,
        locale,
      };
    },
    toFull(
      data: ProjectFrontmatter,
      slug: string,
      html: string,
      _rawContent: string,
    ): Project {
      return {
        slug,
        title: data.title,
        description: data.description,
        date: data.date,
        tags: data.tags,
        cover: data.cover,
        source: data.source,
        demo: data.demo,
        featured: data.featured,
        content: html,
        locale,
      };
    },
  });
}

/** Loader cache to avoid re-creating per call at build time. */
const loaderCache = new Map<string, ContentLoader<ProjectMeta, Project>>();

function getLoader(locale: string): ContentLoader<ProjectMeta, Project> {
  let loader = loaderCache.get(locale);
  if (!loader) {
    loader = createProjectsLoader(locale);
    loaderCache.set(locale, loader);
  }
  return loader;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** 获取所有项目元信息 */
export function getAllProjectsMeta(locale: string): ProjectMeta[] {
  return getLoader(locale).getAllMeta();
}

/** 获取精选项目 */
export function getFeaturedProjects(locale: string): ProjectMeta[] {
  return getAllProjectsMeta(locale).filter((p) => p.featured);
}

/** 根据 slug 获取单个项目 */
export async function getProjectBySlug(
  slug: string,
  locale: string,
): Promise<Project | null> {
  return getLoader(locale).getBySlug(slug);
}

/** 获取指定 locale 下可用的所有 slug（用于 generateStaticParams） */
export function getProjectSlugs(locale: string): string[] {
  return getAllProjectsMeta(locale).map((p) => p.slug);
}

/** 获取所有 locale 下可用的 slug（含回退） */
export function getAllProjectSlugs(): string[] {
  const slugs = new Set<string>();
  for (const locale of ["zh-CN", "en-US"] as const) {
    for (const slug of getProjectSlugs(locale)) {
      slugs.add(slug);
    }
  }
  return Array.from(slugs);
}
