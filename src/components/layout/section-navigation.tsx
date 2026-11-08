"use client";

import { useEffect, useState } from "react";

interface SectionNavigationProps {
  items: readonly { id: string; label: string }[];
  label: string;
  variant: "rail" | "contents";
}

export function SectionNavigation({
  items,
  label,
  variant,
}: SectionNavigationProps) {
  const [activeId, setActiveId] = useState(items[0]?.id);

  useEffect(() => {
    const sections = items.flatMap((item) => {
      const element = document.getElementById(item.id);
      return element ? [{ id: item.id, element }] : [];
    });
    let frameId = 0;

    function syncSection() {
      let current = sections[0]?.id;
      const readingLine = Math.min(220, window.innerHeight * 0.3);
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
    }

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
  }, [items]);

  return (
    <nav
      className={variant === "rail" ? "workbench-index" : "portfolio-toc-list"}
      aria-label={label}
    >
      {items.map((item, index) => (
        <a
          key={item.id}
          className={variant === "contents" ? "portfolio-toc-link" : undefined}
          href={`#${item.id}`}
          aria-label={`${String(index + 1).padStart(2, "0")} ${item.label}`}
          aria-current={activeId === item.id ? "location" : undefined}
        >
          <span className="section-index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>{" "}
          <span className="section-label">{item.label}</span>
        </a>
      ))}
      {variant === "rail" && (
        <span className="workbench-rail-label" aria-hidden="true">
          想法 / 构建 / 交付
        </span>
      )}
    </nav>
  );
}
