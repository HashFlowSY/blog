import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";

import rehypeCodeBlock from "./rehype-code-block";
import remarkCodeMeta from "./remark-code-meta";

/** Represents a heading extracted from rendered HTML, used to build a table of contents */
export interface TocItem {
  level: number;
  id: string;
  text: string;
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

/** 将 Markdown 转换为安全的 HTML，自动为标题生成锚点 ID，代码块语法高亮 */
export async function markdownToHtml(markdown: string, filename?: string) {
  try {
    const result = await remark()
      .use(remarkGfm)
      .use(remarkCodeMeta)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeHighlight)
      .use(rehypeCodeBlock)
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeRemoveInvalidImages)
      .use(rehypeStringify)
      .process(markdown);
    return result.toString();
  } catch (error: unknown) {
    const location = filename ? ` in ${filename}` : "";
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Markdown processing failed${location}: ${message}`);
  }
}

/** 从 HTML 内容中提取 h1/h2/h3 标题的 id 和文本 */
export function extractHeadings(html: string): TocItem[] {
  const headings: TocItem[] = [];
  const regex = /<h([1-3])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1]!, 10),
      id: match[2]!,
      text: match[3]!.replace(/<[^>]*>/g, ""),
    });
  }
  return headings;
}
