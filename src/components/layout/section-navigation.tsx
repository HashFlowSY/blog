"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { MarkdownHeading } from "@/lib/markdown";

interface SectionNavigationProps {
  headings: readonly MarkdownHeading[];
  label: string;
}

export function SectionNavigation({ headings, label }: SectionNavigationProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toolbar = panelRef.current?.parentElement;
    if (!toolbar) return;

    const sections = headings.flatMap(({ id }) => {
      const element = document.getElementById(id);
      return element ? [{ id, element }] : [];
    });
    let frameId = 0;

    const syncSection = () => {
      let current = sections[0]?.id;
      const readingLine = toolbar.getBoundingClientRect().bottom + 48;
      for (const section of sections) {
        if (section.element.getBoundingClientRect().top <= readingLine) {
          current = section.id;
        }
      }
      if (
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 4
      ) {
        current = sections.at(-1)?.id;
      }
      setActiveId(current);
      frameId = 0;
    };

    function requestSync() {
      if (!frameId) frameId = window.requestAnimationFrame(syncSection);
    }

    syncSection();
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
    return () => {
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
      window.cancelAnimationFrame(frameId);
    };
  }, [headings]);

  return (
    <>
      <button
        type="button"
        className="detail-toolbar-control"
        popoverTarget={panelId}
      >
        目录 <span className="detail-contents-chevron" aria-hidden="true" />
      </button>
      <div
        className="detail-contents"
        id={panelId}
        popover="auto"
        ref={panelRef}
      >
        <nav className="detail-contents-links" aria-label={label}>
          {headings.map(({ id, text, level }) => (
            <a
              key={id}
              className="detail-contents-link"
              data-depth={level}
              href={`#${id}`}
              aria-current={activeId === id ? "location" : undefined}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                panelRef.current?.hidePopover();
                const heading = document.getElementById(id);
                if (heading) {
                  heading.tabIndex = -1;
                  heading.focus({ preventScroll: true });
                }
              }}
            >
              {text}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
