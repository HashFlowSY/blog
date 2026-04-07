/**
 * Build-time script that generates a search index for client-side Fuse.js search.
 *
 * Usage: pnpm generate:search
 *
 * Reads all published posts from content/posts/, extracts plaintext content,
 * and writes a JSON array to public/search-index.json.
 */

import fs from "fs";
import path from "path";

import matter from "gray-matter";

import type { SearchIndexEntry } from "../lib/search/search-types";

const POSTS_DIR = path.join(process.cwd(), "content/posts");
const OUTPUT_PATH = path.join(process.cwd(), "public/search-index.json");
const CONTENT_MAX_LENGTH = 2000;
const LOCALES = ["zh-CN", "en-US"] as const;

function stripMarkdownSyntax(text: string): string {
  return (
    text
      // Remove frontmatter
      .replace(/^---[\s\S]*?---/, "")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`[^`]*`/g, "")
      // Remove headings markers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic markers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Remove blockquotes
      .replace(/^\s*>\s?/gm, "")
      // Remove horizontal rules
      .replace(/^---+$/gm, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

function main(): void {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`[search] Posts directory not found: ${POSTS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  const entries: SearchIndexEntry[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
    const { data, content } = matter(raw);

    // Skip drafts
    if (data["draft"] === true) continue;

    const slug =
      typeof data["slug"] === "string"
        ? data["slug"]
        : file.replace(/\.md$/, "");

    const title = typeof data["title"] === "string" ? data["title"] : slug;
    const summary = typeof data["summary"] === "string" ? data["summary"] : "";
    const tags = Array.isArray(data["tags"]) ? data["tags"] : [];

    // Strip markdown syntax and truncate for search index
    const plainContent = stripMarkdownSyntax(content);
    const truncatedContent =
      plainContent.length > CONTENT_MAX_LENGTH
        ? `${plainContent.slice(0, CONTENT_MAX_LENGTH)}…`
        : plainContent;

    // Create one entry per locale (content is the same, locale tag differs)
    for (const locale of LOCALES) {
      entries.push({
        slug,
        title,
        summary,
        tags,
        content: truncatedContent,
        locale,
      });
    }
  }

  // Ensure public directory exists
  const publicDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2), "utf-8");

  // eslint-disable-next-line no-console -- build script output
  console.log(
    `[search] Generated ${entries.length} entries (${entries.length / LOCALES.length} posts × ${LOCALES.length} locales) → ${OUTPUT_PATH}`,
  );
}

main();
