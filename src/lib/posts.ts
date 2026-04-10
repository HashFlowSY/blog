import path from "path";

import { z } from "zod";

import { createContentLoader } from "./content-loader";
import { estimateReadingTime } from "./reading-time";

import type { ContentLoader } from "./content-loader";
import type { Locale } from "@/i18n/routing";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

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
  locale: string;
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
  locale: string;
}

// ---------------------------------------------------------------------------
// Per-locale content loaders
// ---------------------------------------------------------------------------

const POSTS_BASE_DIR = path.join(process.cwd(), "content/posts");

function createPostsLoader(locale: string): ContentLoader<PostMeta, Post> {
  const contentDir = path.join(POSTS_BASE_DIR, locale);

  return createContentLoader({
    contentDir,
    schema: postFrontmatterSchema,
    slugField: "slug",
    draftField: "draft",
    sortField: "date",
    logLabel: `[posts/${locale}]`,
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
        locale,
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
        locale,
      };
    },
  });
}

/** Loader cache to avoid re-creating per call at build time. */
const loaderCache = new Map<string, ContentLoader<PostMeta, Post>>();

function getLoader(locale: string): ContentLoader<PostMeta, Post> {
  let loader = loaderCache.get(locale);
  if (!loader) {
    loader = createPostsLoader(locale);
    loaderCache.set(locale, loader);
  }
  return loader;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** 获取所有已发布文章的元信息（不含 content），包含阅读时间估算 */
export function getAllPostsMeta(locale: string): PostMeta[] {
  return getLoader(locale).getAllMeta();
}

/** 获取所有已发布文章（含 content） */
export async function getAllPosts(locale: string): Promise<Post[]> {
  return getLoader(locale).getAllFull();
}

/** 根据 slug 获取单篇文章 */
export async function getPostBySlug(
  slug: string,
  locale: string,
): Promise<Post | null> {
  return getLoader(locale).getBySlug(slug);
}

/** 获取所有标签 */
export function getAllTags(locale: string): string[] {
  const posts = getAllPostsMeta(locale);
  const tags = new Set<string>();
  posts.forEach((p) => p.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

/** 获取相邻文章（上一篇/下一篇） */
export function getAdjacentPosts(
  slug: string,
  locale: string,
): {
  prev: PostMeta | null;
  next: PostMeta | null;
} {
  const posts = getAllPostsMeta(locale);
  const index = posts.findIndex((p) => p.slug === slug);

  if (index === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: index > 0 ? (posts[index - 1] ?? null) : null,
    next: index < posts.length - 1 ? (posts[index + 1] ?? null) : null,
  };
}

/** 获取指定 locale 下可用的所有 slug（用于 generateStaticParams） */
export function getPostSlugs(locale: string): string[] {
  return getAllPostsMeta(locale).map((p) => p.slug);
}

/** 获取所有 locale 下可用的 slug（含回退） */
export function getAllPostSlugs(): string[] {
  const slugs = new Set<string>();
  for (const locale of ["zh-CN", "en-US"] as Locale[]) {
    for (const slug of getPostSlugs(locale)) {
      slugs.add(slug);
    }
  }
  return Array.from(slugs);
}
