import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";

import rehypeCodeBlock from "./rehype-code-block";
import remarkCodeMeta from "./remark-code-meta";

export type MarkdownHeadingLevel = 1 | 2 | 3;

/** A table-of-contents heading collected from the final sanitized HAST. */
export interface MarkdownHeading {
  readonly level: MarkdownHeadingLevel;
  readonly id: string;
  readonly text: string;
}

/** The complete result of one Markdown rendering pass. */
export interface RenderedMarkdown {
  readonly html: string;
  readonly headings: readonly MarkdownHeading[];
}

export interface RenderMarkdownOptions {
  filename?: string;
  title?: string;
}

const baseAttrs = defaultSchema.attributes ?? {};

const sanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...baseAttrs,
    a: [
      ...(baseAttrs["a"] || []),
      ["data-footnote-ref"],
      ["data-footnote-backref"],
      ["aria-describedby"],
      ["aria-label"],
    ],
    code: [
      ...(baseAttrs["code"] || []),
      ["className", "hljs", /^language-./],
      ["data-meta"],
    ],
    div: [
      ...(baseAttrs["div"] || []),
      ["className", "code-block", "code-block-header"],
      ["data-language"],
    ],
    h2: [...(baseAttrs["h2"] || []), ["className", "sr-only"]],
    input: [
      ...(baseAttrs["input"] || []),
      ["type", "checkbox"],
      ["checked"],
      ["disabled"],
    ],
    li: [...(baseAttrs["li"] || []), ["className", "task-list-item"]],
    section: [
      ...(baseAttrs["section"] || []),
      ["className", "footnotes"],
      ["data-footnotes"],
    ],
    span: [
      ...(baseAttrs["span"] || []),
      ["className", "code-block-lang", /^hljs-/],
      ["data-line"],
      ["data-highlighted"],
    ],
    td: [...(baseAttrs["td"] || []), ["align"]],
    th: [...(baseAttrs["th"] || []), ["align"]],
    ul: [...(baseAttrs["ul"] || []), ["className", "contains-task-list"]],
    pre: [...(baseAttrs["pre"] || [])],
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HastElement = any;

interface SyntaxNode {
  alt?: unknown;
  children?: unknown;
  depth?: unknown;
  properties?: unknown;
  tagName?: unknown;
  type?: unknown;
  value?: unknown;
}

function isSyntaxNode(value: unknown): value is SyntaxNode {
  return typeof value === "object" && value !== null;
}

function syntaxChildren(node: SyntaxNode): SyntaxNode[] {
  if (!Array.isArray(node.children)) return [];
  return node.children.filter(isSyntaxNode);
}

function stringProperty(properties: unknown, property: string): string | null {
  if (!properties || typeof properties !== "object") return null;

  const value = (properties as Record<string, unknown>)[property];
  return typeof value === "string" ? value : null;
}

function hastText(node: SyntaxNode): string {
  if (node.type === "text" && typeof node.value === "string") {
    return node.value;
  }

  return syntaxChildren(node).map(hastText).join("");
}

function markdownHeadingLevel(tagName: string): MarkdownHeadingLevel | null {
  switch (tagName) {
    case "h1":
      return 1;
    case "h2":
      return 2;
    case "h3":
      return 3;
    default:
      return null;
  }
}

function mdastText(node: SyntaxNode): string {
  if (typeof node.value === "string") {
    return node.value;
  }

  if (node.type === "image" && typeof node.alt === "string") {
    return node.alt;
  }

  return syntaxChildren(node).map(mdastText).join("");
}

function normalizedSemanticText(text: string): string {
  return text.trim().replace(/\s+/gu, " ");
}

const remarkRemoveLeadingTitleHeading = (title: string | undefined) => {
  return (tree: unknown) => {
    if (title === undefined || !isSyntaxNode(tree)) return;
    if (!Array.isArray(tree.children)) return;

    const firstChild = tree.children[0];
    if (
      !isSyntaxNode(firstChild) ||
      firstChild.type !== "heading" ||
      firstChild.depth !== 1
    ) {
      return;
    }

    if (
      normalizedSemanticText(mdastText(firstChild)) !==
      normalizedSemanticText(title)
    ) {
      return;
    }

    tree.children.splice(0, 1);
  };
};

function collectHeadings(node: SyntaxNode, headings: MarkdownHeading[]): void {
  if (node.type === "element" && typeof node.tagName === "string") {
    const level = markdownHeadingLevel(node.tagName);
    const id = stringProperty(node.properties, "id");
    if (level !== null && id !== null) {
      headings.push({
        id,
        level,
        text: hastText(node),
      });
    }
  }

  for (const child of syntaxChildren(node)) {
    collectHeadings(child, headings);
  }
}

const rehypeCollectHeadings = (headings: MarkdownHeading[]) => {
  return (tree: unknown) => {
    if (isSyntaxNode(tree)) {
      collectHeadings(tree, headings);
    }
  };
};

const rehypeRemoveInvalidImages = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function walk(node: any): void {
      if (!node || typeof node !== "object") return;
      if (!Array.isArray(node.children)) return;

      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i] as HastElement;
        if (child?.tagName === "img" && !hasValidImageSrc(child)) {
          node.children.splice(i, 1);
          continue;
        }
        walk(child);
      }
    }

    walk(tree);
  };
};

function hasValidImageSrc(image: HastElement): boolean {
  const src = image.properties?.src;
  return typeof src === "string" && src.length > 0;
}

/**
 * Render Markdown once into safe HTML and its matching table-of-contents
 * headings. Headings are collected from the sanitized HAST before
 * serialization, rather than reconstructed from an HTML string.
 */
export async function renderMarkdown(
  markdown: string,
  options: RenderMarkdownOptions = {},
): Promise<RenderedMarkdown> {
  try {
    const headings: MarkdownHeading[] = [];
    const result = await remark()
      .use(remarkGfm)
      .use(remarkCodeMeta)
      .use(remarkRemoveLeadingTitleHeading, options.title)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeHighlight)
      .use(rehypeCodeBlock)
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeRemoveInvalidImages)
      .use(rehypeCollectHeadings, headings)
      .use(rehypeStringify)
      .process(markdown);

    return Object.freeze({
      html: result.toString(),
      headings: Object.freeze(
        headings.map((heading) => Object.freeze({ ...heading })),
      ),
    });
  } catch (error: unknown) {
    const location = options.filename ? ` in ${options.filename}` : "";
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Markdown processing failed${location}: ${message}`);
  }
}
