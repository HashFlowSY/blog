import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

const baseAttrs = defaultSchema.attributes ?? {};

const sanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...baseAttrs,
    code: [...(baseAttrs.code || []), ["className"]],
    span: [...(baseAttrs.span || []), ["className"]],
    pre: [...(baseAttrs.pre || []), ["className"]],
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
