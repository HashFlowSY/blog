import fs from "fs";
import path from "path";

import matter from "gray-matter";

import { markdownToHtml } from "./markdown";

import type { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for a content loader instance. */
export interface ContentLoaderConfig<TSchema extends z.ZodType, TMeta, TFull> {
  /** Absolute or cwd-relative path to the content directory. */
  contentDir: string;
  /** Zod schema used to validate frontmatter. */
  schema: TSchema;
  /** Frontmatter field name for the explicit slug override. Defaults to "slug". */
  slugField?: string;
  /** Frontmatter field name for the draft flag. Defaults to "draft". */
  draftField?: string;
  /** Frontmatter field name used for date-based sorting. Defaults to "date". */
  sortField?: string;
  /** Label used in console warnings (e.g. "[posts]"). */
  logLabel?: string;
  /** Map validated frontmatter + resolved slug + raw markdown to the meta (list) shape. */
  toMeta: (data: z.infer<TSchema>, slug: string, rawContent: string) => TMeta;
  /** Map validated frontmatter + resolved slug + rendered HTML + raw markdown to the full shape. */
  toFull: (
    data: z.infer<TSchema>,
    slug: string,
    html: string,
    rawContent: string,
  ) => TFull;
}

/** Public API returned by createContentLoader. */
export interface ContentLoader<TMeta, TFull> {
  /** Return all published items as meta-only (no HTML content). Sorted by date desc. */
  getAllMeta(): TMeta[];
  /** Return all published items with rendered HTML content. Sorted by date desc. */
  getAllFull(): Promise<TFull[]>;
  /** Return a single published item by slug, with rendered HTML. Null if not found or draft. */
  getBySlug(slug: string): Promise<TFull | null>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a string field from validated frontmatter via Record<string, unknown>. */
function readStringField(
  data: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = data[field];
  return typeof value === "string" ? value : undefined;
}

/** Read a boolean field from validated frontmatter via Record<string, unknown>. */
function readBooleanField(
  data: Record<string, unknown>,
  field: string,
): boolean {
  const value = data[field];
  return typeof value === "boolean" ? value : false;
}

// ---------------------------------------------------------------------------
// Parsed file representation (internal)
// ---------------------------------------------------------------------------

interface ParsedFile<T> {
  data: T;
  content: string;
  filename: string;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a content loader bound to a specific content directory and Zod schema.
 *
 * Generic over:
 * - TSchema: the Zod schema type (determines frontmatter shape)
 * - TMeta:   the lightweight list-item type
 * - TFull:   the full type including rendered HTML content
 */
export function createContentLoader<
  const TSchema extends z.ZodType,
  TMeta,
  TFull,
>(
  config: ContentLoaderConfig<TSchema, TMeta, TFull>,
): ContentLoader<TMeta, TFull> {
  const {
    contentDir,
    schema,
    slugField = "slug",
    draftField = "draft",
    sortField = "date",
    logLabel = "[content]",
    toMeta,
    toFull,
  } = config;

  // ----- Internal helpers -----

  /** Read and validate a single file. Returns null on parse/validation failure. */
  function parseFile(file: string): ParsedFile<z.infer<TSchema>> | null {
    const raw = fs.readFileSync(path.join(contentDir, file), "utf-8");
    const { data, content } = matter(raw);
    const parsed = schema.safeParse(data);

    if (!parsed.success) {
      console.warn(
        `${logLabel} Invalid frontmatter in ${file}: ${parsed.error.message}`,
      );
      return null;
    }

    return { data: parsed.data, content, filename: file };
  }

  /** Resolve the slug: prefer frontmatter field, fall back to filename. */
  function resolveSlug(file: string, data: z.infer<TSchema>): string {
    const record = data as Record<string, unknown>;
    return readStringField(record, slugField) ?? file.replace(/\.md$/, "");
  }

  /** Check whether an item is a draft. */
  function isDraft(data: z.infer<TSchema>): boolean {
    return readBooleanField(data as Record<string, unknown>, draftField);
  }

  /** List all .md files in the content directory. Returns [] if dir missing. */
  function listFiles(): string[] {
    if (!fs.existsSync(contentDir)) return [];
    return fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"));
  }

  // ----- Public API -----

  function getAllMeta(): TMeta[] {
    const files = listFiles();
    const items: TMeta[] = [];

    for (const file of files) {
      const parsed = parseFile(file);
      if (!parsed) continue;
      if (isDraft(parsed.data)) continue;

      const slug = resolveSlug(file, parsed.data);
      items.push(toMeta(parsed.data, slug, parsed.content));
    }

    return items.sort((a, b) => {
      const dateA = readStringField(a as Record<string, unknown>, sortField);
      const dateB = readStringField(b as Record<string, unknown>, sortField);
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA;
    });
  }

  async function getAllFull(): Promise<TFull[]> {
    const files = listFiles();

    const results = await Promise.all(
      files.map(async (file) => {
        const parsed = parseFile(file);
        if (!parsed || isDraft(parsed.data)) return null;

        const slug = resolveSlug(file, parsed.data);
        const html = await markdownToHtml(parsed.content, file);
        return toFull(parsed.data, slug, html, parsed.content);
      }),
    );

    return (results as TFull[])
      .filter((item): item is TFull => item !== null)
      .sort((a, b) => {
        const dateA = readStringField(a as Record<string, unknown>, sortField);
        const dateB = readStringField(b as Record<string, unknown>, sortField);
        const timeA = dateA ? new Date(dateA).getTime() : 0;
        const timeB = dateB ? new Date(dateB).getTime() : 0;
        return timeB - timeA;
      });
  }

  async function getBySlug(slug: string): Promise<TFull | null> {
    const files = listFiles();

    for (const file of files) {
      const parsed = parseFile(file);
      if (!parsed) continue;

      const resolvedSlug = resolveSlug(file, parsed.data);
      if (resolvedSlug !== slug) continue;
      if (isDraft(parsed.data)) return null;

      const html = await markdownToHtml(parsed.content, file);
      return toFull(parsed.data, resolvedSlug, html, parsed.content);
    }

    return null;
  }

  return { getAllMeta, getAllFull, getBySlug };
}
