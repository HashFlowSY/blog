/**
 * Remark plugin that preserves the fenced code block meta string
 * (e.g., `{1,3-5}` from ` ```ts {1,3-5} `) by copying it to `node.data.hProperties`.
 *
 * remark-rehype reads `data.hProperties` and applies them as HTML attributes on
 * the resulting element, so this makes the meta string available as `data-meta`
 * on the `<code>` element in the HAST tree.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RemarkPlugin = (tree: any) => void;

const remarkCodeMeta: () => RemarkPlugin = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    // Walk the tree manually to find code nodes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function walk(node: any): void {
      if (!node || typeof node !== "object") return;

      if (node.type === "code" && node.meta && typeof node.meta === "string") {
        const existing =
          (node.data?.hProperties as Record<string, string> | undefined) ?? {};
        node.data = {
          ...(node.data ?? {}),
          hProperties: { ...existing, "data-meta": node.meta },
        };
      }

      const children = node.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          walk(child);
        }
      }
    }

    walk(tree);
  };
};

export default remarkCodeMeta;
