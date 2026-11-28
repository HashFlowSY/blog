import { renderMarkdown } from "@/components/markdown/document-body";

import { groupChapters, hasContent } from "./project-chapters";
import styles from "./project-detail.module.css";

import type { Root, RootContent } from "hast";

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
      {hasContent(preface) && <MarkdownColumn nodes={preface} />}
      {chapters.map(({ id, prose, evidence }) => {
        const withEvidence = evidence && hasContent(evidence);

        return (
          <section key={id} aria-labelledby={id} className={styles["chapter"]}>
            <MarkdownColumn nodes={prose} />
            {withEvidence && (
              <MarkdownColumn
                nodes={evidence}
                className={styles["chapterEvidence"]}
              />
            )}
          </section>
        );
      })}
      {footnotes.length > 0 && <MarkdownColumn nodes={footnotes} />}
    </div>
  );
}
