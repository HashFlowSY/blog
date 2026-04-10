/**
 * Build-time script that generates a search index for client-side Fuse.js search.
 *
 * Usage: pnpm generate:search
 *
 * Reads all published posts from content/posts/{locale}/, extracts plaintext content,
 * and writes a JSON array to public/search-index.json.
 */

import fs from "fs";
import path from "path";

import { getAllPostsMeta } from "../lib/posts";

import type { SearchIndexEntry } from "../lib/search/search-types";

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
  const entries: SearchIndexEntry[] = [];

  for (const locale of LOCALES) {
    const posts = getAllPostsMeta(locale);

    for (const post of posts) {
      // Read the raw markdown file to get content for search
      const postsDir = path.join(process.cwd(), "content/posts", locale);
      const filePath = path.join(postsDir, `${post.slug}.md`);

      if (!fs.existsSync(filePath)) continue;

      const raw = fs.readFileSync(filePath, "utf-8");
      const plainContent = stripMarkdownSyntax(raw);
      const truncatedContent =
        plainContent.length > CONTENT_MAX_LENGTH
          ? `${plainContent.slice(0, CONTENT_MAX_LENGTH)}…`
          : plainContent;

      entries.push({
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        tags: post.tags,
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
    `[search] Generated ${entries.length} entries across ${LOCALES.length} locales → ${OUTPUT_PATH}`,
  );
}

main();
