import { useId, useRef } from "react";

import type { MarkdownHeading } from "@/lib/markdown";

interface SectionNavigationProps {
  activeId: string | null;
  headings: readonly MarkdownHeading[];
  label: string;
}

export function SectionNavigation({
  activeId,
  headings,
  label,
}: SectionNavigationProps) {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const activeHeading = headings.find(({ id }) => id === activeId);

  return (
    <div className="detail-contents-control">
      {activeHeading && (
        <span className="detail-current-section" title={activeHeading.text}>
          {activeHeading.text}
        </span>
      )}
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
              }}
            >
              {text}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
