import fs from "fs";
import path from "path";
import { z } from "zod";
import matter from "gray-matter";
import { markdownToHtml } from "./markdown";

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

export interface Post {
  slug: string;
  title: string;
  date: string;
  updated: string;
  tags: string[];
  summary: string;
  cover: string | null;
  content: string;
}

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  updated: string;
  tags: string[];
  summary: string;
  cover: string | null;
}

/** 解析单个 Markdown 文件的 frontmatter */
function parsePostFile(
  file: string,
): { data: PostFrontmatter; content: string; filename: string } | null {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
  const { data, content } = matter(raw);
  const parsed = postFrontmatterSchema.safeParse(data);

  if (!parsed.success) {
    console.warn(
      `[posts] Invalid frontmatter in ${file}: ${parsed.error.message}`,
    );
    return null;
  }

  return { data: parsed.data, content, filename: file };
}

/** 获取所有已发布文章的元信息（不含 content） */
export function getAllPostsMeta(): PostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts: PostMeta[] = [];

  for (const file of files) {
    const parsed = parsePostFile(file);
    if (!parsed) continue;
    if (parsed.data.draft) continue;

    const slug = parsed.data.slug || file.replace(/\.md$/, "");
    posts.push({
      slug,
      title: parsed.data.title,
      date: parsed.data.date,
      updated: parsed.data.updated || parsed.data.date,
      tags: parsed.data.tags,
      summary: parsed.data.summary,
      cover: parsed.data.cover,
    });
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/** 获取所有已发布文章（含 content） */
export async function getAllPosts(): Promise<Post[]> {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  const results = await Promise.all(
    files.map(async (file) => {
      const parsed = parsePostFile(file);
      if (!parsed || parsed.data.draft) return null;

      const slug = parsed.data.slug || file.replace(/\.md$/, "");
      const html = await markdownToHtml(parsed.content, file);

      return {
        slug,
        title: parsed.data.title,
        date: parsed.data.date,
        updated: parsed.data.updated || parsed.data.date,
        tags: parsed.data.tags,
        summary: parsed.data.summary,
        cover: parsed.data.cover,
        content: html,
      } satisfies Post;
    }),
  );

  return results
    .filter((p): p is Post => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** 根据 slug 获取单篇文章 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (!fs.existsSync(POSTS_DIR)) return null;

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    const parsed = postFrontmatterSchema.safeParse(data);

    if (!parsed.success) continue;

    const postSlug = parsed.data.slug || file.replace(/\.md$/, "");
    if (postSlug !== slug) continue;
    if (parsed.data.draft) return null;

    const html = await markdownToHtml(content, file);
    return {
      slug: postSlug,
      title: parsed.data.title,
      date: parsed.data.date,
      updated: parsed.data.updated || parsed.data.date,
      tags: parsed.data.tags,
      summary: parsed.data.summary,
      cover: parsed.data.cover,
      content: html,
    };
  }

  return null;
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
    prev: index > 0 ? posts[index - 1] : null,
    next: index < posts.length - 1 ? posts[index + 1] : null,
  };
}
