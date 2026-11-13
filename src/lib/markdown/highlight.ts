import { visit } from "unist-util-visit";

import { markdownError } from "./model";

import type { MarkdownSource } from "./model";
import type { Element, Root } from "hast";
import type { BundledLanguage } from "shiki";

const theme = "github-dark-high-contrast";
const lineMeta =
  /^\{\s*\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*\s*\}$/u;

function highlightedLines(
  meta: string | null,
  lineCount: number,
  fail: (reason: string) => never,
) {
  const lines = new Set<number>();
  if (meta === null) return lines;
  if (!lineMeta.test(meta))
    fail(`Invalid line highlight "${meta}"; expected {1,3-5}.`);

  for (const range of meta.slice(1, -1).split(",")) {
    const [first, last = first] = range.split("-");
    const start = Number(first);
    const end = Number(last);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 1 ||
      start > end ||
      end > lineCount
    ) {
      fail(
        `Invalid line highlight "${range.trim()}"; code block contains ${lineCount} lines.`,
      );
    }
    for (let number = start; number <= end; number++) lines.add(number);
  }
  return lines;
}

export async function highlightDocuments(
  documents: readonly { source: MarkdownSource; tree: Root }[],
): Promise<void> {
  const fences: { source: MarkdownSource; node: Element }[] = [];
  for (const { source, tree } of documents) {
    visit(tree, "element", (node) => {
      if (node.tagName === "pre") fences.push({ source, node });
    });
  }
  if (fences.length === 0) return;

  const {
    bundledLanguages,
    createHighlighter,
    guessEmbeddedLanguages,
    isPlainLang,
  } = await import("shiki");
  function bundled(language: string): language is BundledLanguage {
    return Object.hasOwn(bundledLanguages, language);
  }

  const languages = new Set<BundledLanguage>();
  const blocks = fences.map(({ source, node }) => {
    const fence = node.data?.fence;
    function fail(reason: string): never {
      throw markdownError(source, node.position?.start, reason);
    }
    if (!fence) return fail("Missing code fence data.");
    const language = fence.language ?? "text";
    const isBundled = bundled(language);
    if (!isBundled && !isPlainLang(language))
      fail(`Unknown code language "${language}".`);
    const code = fence.source.replace(/\r\n?/gu, "\n");
    const lines = highlightedLines(
      fence.meta,
      code === "" ? 0 : code.split("\n").length,
      fail,
    );
    if (isBundled) {
      languages.add(language);
      for (const embedded of guessEmbeddedLanguages(code, language)) {
        if (bundled(embedded)) languages.add(embedded);
      }
    }
    return {
      node,
      language,
      code,
      lines,
      label: fence.language ?? "纯文本",
      original: fence.source,
      fail,
    };
  });

  const shiki = await createHighlighter({
    themes: [theme],
    langs: [...languages],
  });
  try {
    for (const {
      node,
      language,
      code,
      original,
      label,
      lines,
      fail,
    } of blocks) {
      const root = shiki.codeToHast(code, {
        lang: language,
        theme,
        transformers: [
          {
            line(line, number) {
              if (lines.has(number)) this.addClassToHast(line, "highlighted");
            },
          },
        ],
      });
      const pre = root.children[0];
      if (pre?.type !== "element" || pre.tagName !== "pre")
        return fail("Shiki did not produce a code block.");
      node.properties = pre.properties;
      node.children = pre.children;
      node.data = { codeFrame: { source: original, label } };
    }
  } finally {
    shiki.dispose();
  }
}
