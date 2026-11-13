import { toString as hastText } from "hast-util-to-string";
import { visit } from "unist-util-visit";

import { parseUrlReference, URL_PATH_NORMALIZATION_BASE } from "../url-path";

import { markdownError } from "./model";
import { anchorPrefix, noteLabelId } from "./semantics";

import type { MarkdownSource } from "./model";
import type { Element, Root } from "hast";

function rootLink(value: string, basePath: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return value;
  const url = parseUrlReference(value);
  return url.origin === URL_PATH_NORMALIZATION_BASE
    ? `${basePath}${url.pathname}${url.search}${url.hash}`
    : value;
}

function elementFor(
  ids: ReadonlyMap<string, Element>,
  source: MarkdownSource,
  node: Element,
  id: string,
) {
  const target = ids.get(id);
  if (!target) {
    throw markdownError(
      source,
      node.position?.start,
      `Unknown Markdown target #${id}.`,
    );
  }
  target.properties["tabIndex"] = -1;
  return target;
}

function insertNoteReturns(notes: ReadonlyMap<Element, Element[]>) {
  for (const [note, references] of notes) {
    const last = note.children.at(-1);
    const container =
      last?.type === "element" && last.tagName === "p" ? last : note;

    for (const [index, reference] of references.entries()) {
      const suffix = references.length > 1 ? `（第 ${index + 1} 处）` : "";
      container.children.push(
        { type: "text", value: " " },
        {
          type: "element",
          tagName: "a",
          properties: {
            href: `#${reference.properties["id"]}`,
            dataFootnoteBackref: true,
            ariaLabel: `返回脚注 ${hastText(reference)} 的引用${suffix}`,
          },
          children: [
            {
              type: "text",
              value: index === 0 ? "↩" : `↩${index + 1}`,
            },
          ],
        },
      );
    }
  }
}

export function bindDocumentLinks(
  tree: Root,
  source: MarkdownSource,
  basePath: string,
) {
  const ids = new Map<string, Element>();
  const notes = new Map<Element, Element[]>();
  visit(tree, "element", (node) => {
    const { id } = node.properties;
    if (typeof id !== "string") return;
    if (ids.has(id)) {
      throw markdownError(
        source,
        node.position?.start,
        `Duplicate Markdown ID "${id}".`,
      );
    }
    ids.set(id, node);
  });

  visit(tree, "element", (node, index, parent) => {
    const { properties } = node;
    if (node.tagName === "img") {
      const url = properties["src"];
      if (typeof url === "string" && url) {
        properties["src"] = rootLink(url, basePath);
      } else if (parent && index !== undefined) {
        parent.children.splice(index, 1);
        return index;
      }
    }
    // Backlinks are built from the complete set of rendered references, including
    // references in definitions that may have been rendered after their target.
    if ("dataFootnoteBackref" in properties && parent && index !== undefined) {
      parent.children.splice(index, 1);
      return index;
    }
    if (node.tagName !== "a" || typeof properties["href"] !== "string") return;

    const href = properties["href"];
    if ("dataFootnoteRef" in properties) {
      const id = anchorPrefix + href.slice(1);
      const note = elementFor(ids, source, node, id);
      properties["href"] = `#${id}`;
      properties["ariaDescribedBy"] = [anchorPrefix + noteLabelId];
      const references = notes.get(note);
      if (references) references.push(node);
      else notes.set(note, [node]);
    } else if (href.startsWith("#")) {
      let slug: string;
      try {
        slug = decodeURIComponent(href.slice(1));
      } catch {
        throw markdownError(
          source,
          node.position?.start,
          `Invalid Markdown fragment "${href}".`,
        );
      }
      const id = anchorPrefix + slug;
      elementFor(ids, source, node, id);
      properties["href"] = `#${id}`;
    } else {
      properties["href"] = rootLink(href, basePath);
    }
  });
  insertNoteReturns(notes);
}
