import { toString as textContent } from "hast-util-to-string";
import Link from "next/link";

import { normalizeText } from "@/lib/markdown/model";

import { groupChapters, hasContent } from "./project-chapters";
import styles from "./project-glance.module.css";

import type { Root } from "hast";

export function ProjectGlance({ tree, slug }: { tree: Root; slug: string }) {
  const entries = groupChapters(tree)
    .chapters.filter(({ evidence }) => evidence && hasContent(evidence))
    .slice(0, 3)
    .map(({ id, prose, evidence }) => {
      const first = evidence?.find((node) => node.type === "element");
      const heading = first?.tagName === "h3" ? first : undefined;
      const paragraph = prose.find(
        (node) => node.type === "element" && node.tagName === "p",
      );
      return {
        id:
          typeof heading?.properties["id"] === "string"
            ? heading.properties["id"]
            : id,
        label: normalizeText(textContent(heading ?? prose[0]!)),
        excerpt: paragraph
          ? normalizeText(textContent(paragraph)).split(/(?<=[。！？])/u, 1)[0]
          : undefined,
      };
    });
  if (entries.length < 2) return null;
  return (
    <details className={styles["glance"]}>
      <summary>项目速览</summary>
      <ul>
        {entries.map(({ id, label, excerpt }) => (
          <li key={id}>
            <Link
              href={`/projects/${slug}/#${encodeURIComponent(id)}`}
              data-project-entry={slug}
            >
              {label} <span aria-hidden="true">→</span>
            </Link>
            {excerpt && <p>{excerpt}</p>}
          </li>
        ))}
      </ul>
    </details>
  );
}
