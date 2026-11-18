import { renderMarkdown } from "@/components/markdown/document-body";

import styles from "./project-detail.module.css";

import type { Root, RootContent } from "hast";

interface Chapter {
  id: string;
  prose: RootContent[];
  evidence?: RootContent[];
}

function groupChapters(tree: Root) {
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

function hasContent(nodes: RootContent[]) {
  return nodes.some(
    (node) =>
      node.type === "element" || (node.type === "text" && node.value.trim()),
  );
}

function MarkdownColumn({
  nodes,
  className,
}: {
  nodes: RootContent[];
  className?: string | undefined;
}) {
  return (
    <div className={className ? `markdown-body ${className}` : "markdown-body"}>
      {renderMarkdown({ type: "root", children: nodes })}
    </div>
  );
}

export function ProjectStory({ id, tree }: { id: string; tree: Root }) {
  const { preface, chapters, footnotes } = groupChapters(tree);

  return (
    <div id={id}>
      {hasContent(preface) && (
        <MarkdownColumn nodes={preface} className={styles["plainStory"]} />
      )}
      {chapters.map(({ id, prose, evidence }, index) => {
        const withEvidence = evidence && hasContent(evidence);

        return (
          <section
            key={id}
            aria-labelledby={id}
            className={styles["chapter"]}
            data-evidence={withEvidence || undefined}
          >
            <div>
              {withEvidence && (
                <p className={styles["chapterIndex"]} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </p>
              )}
              <MarkdownColumn nodes={prose} />
            </div>
            {withEvidence && (
              <MarkdownColumn
                nodes={evidence}
                className={styles["chapterEvidence"]}
              />
            )}
          </section>
        );
      })}
      {footnotes.length > 0 && (
        <MarkdownColumn nodes={footnotes} className={styles["plainStory"]} />
      )}
    </div>
  );
}
