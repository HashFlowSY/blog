import path from "path";

import { z } from "zod";

import { createContentLoader } from "./content-loader";
import { estimateReadingTime } from "./reading-time";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const POSTS_DIR = path.join(process.cwd(), "content/posts");

const postFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  date: z.string().optional().default("1970-01-01"),
  updated: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  summary: z.string().optional().default(""),
  cover: z.string().optional().nullable().default(null),
  draft: z.boolean().optional().default(false),
});

type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface Post {
  slug: string;
  title: string;
  date: string;
  updated: string;
  tags: string[];
  summary: string;
  cover: string | null;
  content: string;
  readingTime: number;
}

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  updated: string;
  tags: string[];
  summary: string;
  cover: string | null;
  readingTime: number;
}

// ---------------------------------------------------------------------------
// Content loader instance
// ---------------------------------------------------------------------------

const postsLoader = createContentLoader({
  contentDir: POSTS_DIR,
  schema: postFrontmatterSchema,
  slugField: "slug",
  draftField: "draft",
  sortField: "date",
  logLabel: "[posts]",
  toMeta(data: PostFrontmatter, slug: string, rawContent: string): PostMeta {
    return {
      slug,
      title: data.title,
      date: data.date,
      updated: data.updated ?? data.date,
      tags: data.tags,
      summary: data.summary,
      cover: data.cover,
      readingTime: estimateReadingTime(rawContent),
    };
  },
  toFull(
    data: PostFrontmatter,
    slug: string,
    html: string,
    rawContent: string,
  ): Post {
    return {
      slug,
      title: data.title,
      date: data.date,
      updated: data.updated ?? data.date,
      tags: data.tags,
      summary: data.summary,
      cover: data.cover,
      content: html,
      readingTime: estimateReadingTime(rawContent),
    };
  },
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** 获取所有已发布文章的元信息（不含 content），包含阅读时间估算 */
export function getAllPostsMeta(): PostMeta[] {
  return postsLoader.getAllMeta();
}

/** 获取所有已发布文章（含 content） */
export async function getAllPosts(): Promise<Post[]> {
  return postsLoader.getAllFull();
}

/** 根据 slug 获取单篇文章 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  return postsLoader.getBySlug(slug);
}

/** 获取所有标签 */
export function getAllTags(): string[] {
  const posts = getAllPostsMeta();
  const tags = new Set<string>();
  posts.forEach((p) => p.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

/** 获取相邻文章（上一篇/下一篇） */
export function getAdjacentPosts(slug: string): {
  prev: PostMeta | null;
  next: PostMeta | null;
} {
  const posts = getAllPostsMeta();
  const index = posts.findIndex((p) => p.slug === slug);

  return {
    prev: index > 0 ? (posts[index - 1] ?? null) : null,
    next: index < posts.length - 1 ? (posts[index + 1] ?? null) : null,
  };
}
