"use client";

import { useEffect, useState } from "react";

import type { TocItem } from "@/lib/markdown";
export type { TocItem };

interface PostTocProps {
  headings: TocItem[];
}

/** 文章目录组件 — headings 由服务端从 HTML 内容中提取后传入 */
export function PostToc({ headings }: PostTocProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" },
    );

    const article = document.querySelector(".prose");
    if (!article) return;
    article
      .querySelectorAll("h1, h2, h3")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="rounded-lg border border-border p-4">
      <ul className="space-y-1 text-sm">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{ paddingLeft: `${(heading.level - 1) * 0.75}rem` }}
          >
            <a
              href={`#${heading.id}`}
              className={`block py-0.5 transition-colors hover:text-foreground ${
                activeId === heading.id
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(heading.id)
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
