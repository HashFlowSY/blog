/**
 * Parse a line highlight meta string like `{1,3-5}` into a Set of line numbers.
 * Returns an empty Set for invalid or empty inputs.
 */
function parseHighlightMeta(meta: string): Set<number> {
  const lines = new Set<number>();
  const content = meta.trim();
  if (!content || content === "{}") return lines;

  // Extract the content between braces
  const inner = content.replace(/^\{/, "").replace(/}$/, "");
  if (!inner.trim()) return lines;

  for (const part of inner.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]!, 10);
      const end = parseInt(rangeMatch[2]!, 10);
      if (start > 0 && end >= start) {
        for (let i = start; i <= end; i++) {
          lines.add(i);
        }
      }
      continue;
    }

    const singleNum = parseInt(trimmed, 10);
    if (singleNum > 0) {
      lines.add(singleNum);
    }
  }

  return lines;
}

/**
 * Extract language from a CSS class string like "language-typescript hljs"
 */
function extractLanguage(className: string | undefined): string | null {
  if (!className) return null;
  const match = className.match(/language-(\S+)/);
  return match?.[1] ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HastElement = any;

const rehypeCodeBlock = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function walk(node: any): void {
      if (!node || typeof node !== "object") return;
      if (!Array.isArray(node.children)) return;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child?.tagName === "pre") {
          enhanceCodeBlock(child, node.children, i);
        }
        walk(child);
      }
    }

    walk(tree);
  };
};

function enhanceCodeBlock(
  preEl: HastElement,
  siblings: HastElement[],
  index: number,
) {
  const codeEl = (preEl.children ?? []).find(
    (c: HastElement) => c.tagName === "code",
  );
  if (!codeEl) return;

  const className = codeEl.properties?.className;
  const classStr = Array.isArray(className)
    ? className.join(" ")
    : (className ?? "");
  const language = extractLanguage(classStr);

  // Get highlight lines from data-meta (remark-rehype preserves hProperties keys)
  const metaStr =
    (codeEl.properties?.dataMeta as string | undefined) ??
    (codeEl.properties?.["data-meta"] as string | undefined);
  const highlightedLines = metaStr
    ? parseHighlightMeta(metaStr)
    : new Set<number>();

  // Get the text content
  const textContent = getTextContent(codeEl);
  const lines = textContent.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();

  if (lines.length > 0) {
    const lineSpans = buildLineSpans(codeEl, lines.length, highlightedLines);
    codeEl.children = lineSpans;
  }

  // Wrap pre in code-block div
  const wrapperProps: Record<string, unknown> = { className: "code-block" };
  if (language) wrapperProps["data-language"] = language;

  const headerChildren: HastElement[] = [];
  if (language) {
    headerChildren.push({
      type: "element",
      tagName: "span",
      properties: { className: "code-block-lang" },
      children: [{ type: "text", value: language }],
    });
  }

  const wrapperChildren: HastElement[] = [];
  if (headerChildren.length > 0) {
    wrapperChildren.push({
      type: "element",
      tagName: "div",
      properties: { className: "code-block-header" },
      children: headerChildren,
    });
  }
  wrapperChildren.push(preEl);

  const wrapper: HastElement = {
    type: "element",
    tagName: "div",
    properties: wrapperProps,
    children: wrapperChildren,
  };

  siblings[index] = wrapper;
}

function getTextContent(node: HastElement): string {
  if (!node.children) return "";
  let text = "";
  for (const child of node.children) {
    if (typeof child === "string") {
      text += child;
    } else if (child?.type === "text") {
      text += child.value ?? "";
    } else if (child?.type === "element") {
      text += getTextContent(child);
    }
  }
  return text;
}

function buildLineSpans(
  codeEl: HastElement,
  totalLines: number,
  highlightedLines: Set<number>,
): HastElement[] {
  const sourceChildren = codeEl.children ?? [];

  type LineItem =
    | { kind: "text"; value: string }
    | { kind: "element"; node: HastElement };
  const lineItems: LineItem[][] = Array.from({ length: totalLines }, () => []);

  // Track current line via newlines encountered in text nodes
  let currentLine = 0;

  for (const child of sourceChildren) {
    if (typeof child === "object" && child?.type === "text") {
      const parts = child.value.split("\n");
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i] ?? "";
        // Skip empty trailing text after last newline
        if (i === parts.length - 1 && part === "" && i > 0) break;
        const lineIdx = Math.min(currentLine, totalLines - 1);
        lineItems[lineIdx]!.push({ kind: "text", value: part });
        if (i < parts.length - 1) {
          currentLine++;
        }
      }
    } else if (typeof child === "object" && child?.type === "element") {
      const lineIdx = Math.min(currentLine, totalLines - 1);
      lineItems[lineIdx]!.push({ kind: "element", node: child });
    }
  }

  const result: HastElement[] = [];

  for (let lineIdx = 0; lineIdx < totalLines; lineIdx++) {
    const props: Record<string, unknown> = { "data-line": String(lineIdx + 1) };
    if (highlightedLines.has(lineIdx + 1)) {
      props["data-highlighted"] = "true";
    }

    const children: HastElement[] = [];
    for (const item of lineItems[lineIdx]!) {
      if (item.kind === "text") {
        children.push({ type: "text", value: item.value });
      } else {
        children.push(item.node);
      }
    }

    result.push({
      type: "element",
      tagName: "span",
      properties: props,
      children,
    });
  }

  // Add newlines between spans
  const finalSpans: HastElement[] = [];
  for (let i = 0; i < result.length; i++) {
    finalSpans.push(result[i]!);
    if (i < result.length - 1) {
      finalSpans.push({ type: "text", value: "\n" });
    }
  }

  return finalSpans;
}

export default rehypeCodeBlock;
