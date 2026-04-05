import path from "path";

import { z } from "zod";

import { createContentLoader } from "./content-loader";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const PROJECTS_DIR = path.join(process.cwd(), "content/projects");

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
}

// ---------------------------------------------------------------------------
// Content loader instance
// ---------------------------------------------------------------------------

const projectsLoader = createContentLoader({
  contentDir: PROJECTS_DIR,
  schema: projectFrontmatterSchema,
  slugField: "slug",
  draftField: "draft",
  sortField: "date",
  logLabel: "[projects]",
  toMeta(data: ProjectFrontmatter, slug: string): ProjectMeta {
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
    };
  },
  toFull(data: ProjectFrontmatter, slug: string, html: string): Project {
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
    };
  },
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** 获取所有项目元信息 */
export function getAllProjectsMeta(): ProjectMeta[] {
  return projectsLoader.getAllMeta();
}

/** 获取精选项目 */
export function getFeaturedProjects(): ProjectMeta[] {
  return getAllProjectsMeta().filter((p) => p.featured);
}

/** 根据 slug 获取单个项目 */
export async function getProjectBySlug(
  slug: string,
): Promise<Project | null> {
  return projectsLoader.getBySlug(slug);
}
