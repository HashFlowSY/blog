"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import type { TocItem } from "@/lib/markdown";
export type { TocItem };

interface PostTocProps {
  headings: TocItem[];
}

/** 文章目录组件 — headings 由服务端从 HTML 内容中提取后传入 */
export function PostToc({ headings }: PostTocProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

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
    <nav
      aria-label="Table of contents"
      className="rounded-lg border border-border p-4"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-medium text-foreground lg:cursor-default lg:pointer-events-none"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span>Table of Contents</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform lg:hidden ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div className={`mt-2 lg:block ${isOpen ? "block" : "hidden"}`}>
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
                  document.getElementById(heading.id)?.scrollIntoView({
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "instant"
                      : "smooth",
                  });
                }}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
