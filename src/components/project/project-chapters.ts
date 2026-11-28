import type { Root, RootContent } from "hast";

interface Chapter {
  id: string;
  prose: RootContent[];
  evidence?: RootContent[];
}

export function groupChapters(tree: Root) {
  const preface: RootContent[] = [];
  const chapters: Chapter[] = [];
  const footnotes: RootContent[] = [];
  let chapter: Chapter | undefined;

  for (const node of tree.children) {
    if (node.type === "element") {
      if (node.tagName === "h2" && typeof node.properties["id"] === "string") {
        chapter = { id: node.properties["id"], prose: [node] };
        chapters.push(chapter);
        continue;
      }
      if (node.tagName === "hr" && chapter && !chapter.evidence) {
        // The first rule in a chapter separates its explanation from its evidence.
        chapter.evidence = [];
        continue;
      }
      if ("dataFootnotes" in node.properties) {
        footnotes.push(node);
        continue;
      }
    }

    (chapter?.evidence ?? chapter?.prose ?? preface).push(node);
  }

  return { preface, chapters, footnotes };
}

export function hasContent(nodes: RootContent[]) {
  return nodes.some(
    (node) =>
      node.type === "element" || (node.type === "text" && node.value.trim()),
  );
}
