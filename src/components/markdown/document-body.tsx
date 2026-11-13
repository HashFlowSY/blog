import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

import { CopyCode } from "./copy-code";

import type { Element, Root } from "hast";
import type { ComponentPropsWithoutRef, ReactElement } from "react";

function CodeBlock({
  node,
  ...props
}: ComponentPropsWithoutRef<"pre"> & { node?: Element | undefined }) {
  const frame = node?.data?.codeFrame;
  if (!frame) throw new Error("Expected a compiled code block.");

  return (
    <figure className="markdown-code" aria-label={`${frame.label} 代码`}>
      <figcaption className="markdown-code-bar">
        <span>{frame.label}</span>
        <CopyCode source={frame.source} />
      </figcaption>
      <pre {...props} role="region" aria-label={`${frame.label} 源码`} />
    </figure>
  );
}

function ScrollTable({
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"table"> & { node?: Element | undefined }) {
  return (
    <div
      className="markdown-table-scroll"
      role="region"
      aria-label="正文表格"
      tabIndex={0}
    >
      <table {...props} />
    </div>
  );
}

export function DocumentBody({ id, tree }: { id: string; tree: Root }) {
  const content: ReactElement = toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: { pre: CodeBlock, table: ScrollTable },
    passNode: true,
  });
  return (
    <div className="markdown-body" id={id}>
      {content}
    </div>
  );
}
