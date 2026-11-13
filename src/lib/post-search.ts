import type { PostCardMeta } from "./content-catalog";

export const POST_SEARCH_INDEX_PATH = "/search-index.json";

export type PostSearchIndex = readonly {
  readonly slug: string;
  readonly blocks: readonly string[];
}[];

export type PostSearchBlocks = ReadonlyMap<string, readonly string[]>;

export interface PostSearchSnippet {
  readonly before: string;
  readonly match: string;
  readonly after: string;
}

export interface PostSearchResult {
  post: PostCardMeta;
  snippet?: PostSearchSnippet;
}

function parseIndex(value: unknown): PostSearchBlocks {
  if (!Array.isArray(value)) throw new Error("Invalid article search index");

  const blocks = new Map<string, readonly string[]>();
  const entries: unknown[] = value;
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("slug" in entry) ||
      typeof entry.slug !== "string" ||
      blocks.has(entry.slug) ||
      !("blocks" in entry) ||
      !Array.isArray(entry.blocks) ||
      !entry.blocks.every(
        (block: unknown): block is string => typeof block === "string",
      )
    )
      throw new Error("Invalid article search index entry");
    blocks.set(entry.slug, entry.blocks);
  }
  return blocks;
}

export async function loadPostSearchIndex(
  url: string,
  posts: readonly Pick<PostCardMeta, "slug">[],
): Promise<PostSearchBlocks> {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error("Article search index unavailable");

  const index = parseIndex(await response.json());
  if (index.size !== posts.length || posts.some(({ slug }) => !index.has(slug)))
    throw new Error("Article search index does not match the archive");
  return index;
}

function matchSnippet(
  text: string,
  pattern: RegExp,
): PostSearchSnippet | undefined {
  const match = pattern.exec(text);
  if (!match) return;

  const before = Array.from(text.slice(0, match.index));
  const after = Array.from(text.slice(match.index + match[0].length));
  return {
    before: `${before.length > 26 ? "…" : ""}${before.slice(-26).join("")}`,
    match: match[0],
    after: `${after.slice(0, 42).join("")}${after.length > 42 ? "…" : ""}`,
  };
}

export function searchPosts(
  posts: readonly PostCardMeta[],
  query: string,
  index: PostSearchBlocks,
): PostSearchResult[] {
  const term = query.trim().replace(/\s+/gu, " ");
  const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "iu");
  const matches: (PostSearchResult & { rank: number })[] = [];
  for (const post of posts) {
    const blocks = index.get(post.slug);
    if (!blocks) throw new Error("Article is missing from the search index");

    if (pattern.test(post.title)) {
      matches.push({ post, rank: 0 });
      continue;
    }
    if (
      pattern.test(post.summary) ||
      post.tags.some((tag) => pattern.test(tag))
    ) {
      matches.push({ post, rank: 1 });
      continue;
    }

    for (const block of blocks) {
      const snippet = matchSnippet(block, pattern);
      if (!snippet) continue;
      matches.push({ post, snippet, rank: 2 });
      break;
    }
  }

  return matches.sort(
    (left, right) =>
      left.rank - right.rank ||
      right.post.date.localeCompare(left.post.date) ||
      left.post.slug.localeCompare(right.post.slug),
  );
}
