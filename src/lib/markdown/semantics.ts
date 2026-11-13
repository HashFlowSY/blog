import GithubSlugger from "github-slugger";
import { toString as hastText } from "hast-util-to-string";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import { normalizeText } from "./model";

import type { MarkdownSource } from "./model";
import type { Element, Root } from "hast";
import type { Code, Nodes, Root as MarkdownRoot } from "mdast";

export const anchorPrefix = "user-content-";
const noteNamespace = "footnote:";
export const noteLabelId = `${noteNamespace}label`;

const sanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  clobberPrefix: anchorPrefix,
  attributes: {
    a: ["href", "title", "id", "dataFootnoteRef", "dataFootnoteBackref"],
    h1: ["id"],
    h2: ["id", ["className", "sr-only"]],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"],
    img: ["src", "alt", "title"],
    input: ["checked", ["disabled", true], ["type", "checkbox"]],
    li: ["id", ["className", "task-list-item"]],
    ol: ["start", ["className", "contains-task-list"]],
    section: ["dataFootnotes", ["className", "footnotes"]],
    td: [["align", "left", "center", "right"]],
    th: [["align", "left", "center", "right"]],
    ul: [["className", "contains-task-list"]],
  },
  tagNames: [
    "a",
    "blockquote",
    "br",
    "code",
    "del",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "img",
    "input",
    "li",
    "ol",
    "p",
    "pre",
    "section",
    "strong",
    "sup",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
  ],
};

function headingText(node: Nodes): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
      return node.value;
    case "image":
    case "imageReference":
      return node.alt ?? "";
    case "break":
      return " ";
    default:
      return "children" in node ? node.children.map(headingText).join("") : "";
  }
}

function normalizeMarkdown(tree: MarkdownRoot, title: string) {
  const first = tree.children[0];
  if (
    first?.type === "heading" &&
    first.depth === 1 &&
    normalizeText(headingText(first)) === normalizeText(title)
  ) {
    tree.children.shift();
  }

  // Numeric IDs keep a second reference to x distinct from a reference to x-2.
  const noteIds = new Map<string, string>();
  function noteId(identifier: string) {
    const previous = noteIds.get(identifier);
    if (previous !== undefined) return previous;
    const next = String(noteIds.size + 1);
    noteIds.set(identifier, next);
    return next;
  }
  visit(tree, "footnoteReference", (node) => {
    node.identifier = noteId(node.identifier);
  });
  visit(tree, "footnoteDefinition", (node) => {
    node.identifier = noteId(node.identifier);
  });
}

const prepareAnchors = () => (tree: Root) => {
  const slugger = new GithubSlugger();
  visit(tree, "element", (node) => {
    if (node.properties["id"] === "footnote-label") {
      node.properties["id"] = noteLabelId;
    } else if (/^h[1-6]$/u.test(node.tagName)) {
      node.properties["id"] = slugger.slug(hastText(node));
    }
  });
};

const markdown = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, {
    clobberPrefix: noteNamespace,
    footnoteLabel: "脚注",
    handlers: {
      code(state, node: Code) {
        const element: Element = {
          type: "element",
          tagName: "pre",
          properties: {},
          data: {
            fence: {
              source: node.value,
              language: node.lang ?? null,
              meta: node.meta ?? null,
            },
          },
          children: [],
        };
        state.patch(node, element);
        return element;
      },
    },
  })
  .use(prepareAnchors)
  .use(rehypeSanitize, sanitizeSchema)
  .freeze();

export async function readBodyTree(source: MarkdownSource): Promise<Root> {
  const tree = markdown.parse(source.body);
  normalizeMarkdown(tree, source.title);
  return markdown.run(tree);
}
