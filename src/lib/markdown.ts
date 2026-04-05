import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkRehype from "remark-rehype";

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
    code: [...(baseAttrs["code"] || []), ["className"]],
    span: [...(baseAttrs["span"] || []), ["className"]],
    pre: [...(baseAttrs["pre"] || []), ["className"]],
  },
};

/** 将 Markdown 转换为安全的 HTML，自动为标题生成锚点 ID，代码块语法高亮 */
export async function markdownToHtml(markdown: string, filename?: string) {
  try {
    const result = await remark()
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeHighlight)
      .use(rehypeSanitize, sanitizeSchema)
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
