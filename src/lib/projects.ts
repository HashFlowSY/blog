import fs from "fs";
import path from "path";
import { z } from "zod";
import matter from "gray-matter";
import { markdownToHtml } from "./markdown";

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

/** 获取所有项目元信息 */
export function getAllProjectsMeta(): ProjectMeta[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  const files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith(".md"));
  const projects: ProjectMeta[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(PROJECTS_DIR, file), "utf-8");
    const { data } = matter(raw);
    const parsed = projectFrontmatterSchema.safeParse(data);

    if (!parsed.success) {
      console.warn(
        `[projects] Invalid frontmatter in ${file}: ${parsed.error.message}`,
      );
      continue;
    }
    if (parsed.data.draft) continue;

    const slug = parsed.data.slug || file.replace(/\.md$/, "");
    projects.push({
      slug,
      title: parsed.data.title,
      description: parsed.data.description,
      date: parsed.data.date,
      tags: parsed.data.tags,
      cover: parsed.data.cover,
      source: parsed.data.source,
      demo: parsed.data.demo,
      featured: parsed.data.featured,
    });
  }

  return projects.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/** 获取精选项目 */
export function getFeaturedProjects(): ProjectMeta[] {
  return getAllProjectsMeta().filter((p) => p.featured);
}

/** 根据 slug 获取单个项目 */
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  if (!fs.existsSync(PROJECTS_DIR)) return null;

  const files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(PROJECTS_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    const parsed = projectFrontmatterSchema.safeParse(data);

    if (!parsed.success) continue;

    const projectSlug = parsed.data.slug || file.replace(/\.md$/, "");
    if (projectSlug !== slug) continue;
    if (parsed.data.draft) return null;

    const html = await markdownToHtml(content, file);
    return {
      slug: projectSlug,
      title: parsed.data.title,
      description: parsed.data.description,
      date: parsed.data.date,
      tags: parsed.data.tags,
      cover: parsed.data.cover,
      source: parsed.data.source,
      demo: parsed.data.demo,
      featured: parsed.data.featured,
      content: html,
    };
  }

  return null;
}
