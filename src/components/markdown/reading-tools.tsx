"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";

import {
  articleFilterSearch,
  collectionCardId,
} from "@/lib/content-navigation";

import type { ContentCollection } from "@/lib/content-navigation";
import type { DocumentHeading } from "@/lib/markdown/model";

function ReturnLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="reader-button reader-return" href={href} replace>
      <span aria-hidden="true">←</span> {label}
    </Link>
  );
}

function PostReturn({ card }: { card: string }) {
  const params = useSearchParams();
  const filters = articleFilterSearch(
    params.get("q") ?? "",
    params.get("topic"),
  );
  return <ReturnLink label="返回文章列表" href={`/posts/${filters}#${card}`} />;
}

function Contents({
  outline,
  activeId,
  label,
}: {
  outline: readonly DocumentHeading[];
  activeId: string | null;
  label: string;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const current = outline.find((heading) => heading.id === activeId);

  return (
    <div className="reader-contents">
      {current && (
        <span className="reader-section-name" title={current.text}>
          {current.text}
        </span>
      )}
      <button type="button" className="reader-button" popoverTarget={id}>
        目录 <span className="reader-chevron" aria-hidden="true" />
      </button>
      <div id={id} ref={panel} className="reader-panel" popover="auto">
        <nav className="reader-outline" aria-label={label}>
          {outline.map(({ id: target, text, level }) => (
            <a
              key={target}
              href={`#${target}`}
              data-depth={level}
              aria-current={activeId === target ? "location" : undefined}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                panel.current?.hidePopover();
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

export function ReadingTools({
  bodyId,
  collection,
  slug,
  outline,
}: {
  bodyId: string;
  collection: ContentCollection;
  slug: string;
  outline: readonly DocumentHeading[];
}) {
  const bar = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    progress: number;
    activeId: string | null;
  }>({
    progress: 0,
    activeId: null,
  });
  const card = collectionCardId(collection, slug);
  const isPost = collection === "posts";

  useEffect(() => {
    const toolbar = bar.current;
    const body = document.getElementById(bodyId);
    const viewport = window.visualViewport;
    if (!toolbar || !body || !viewport) return;

    const sections = outline.map(({ id }) => document.getElementById(id));
    let frame = 0;
    const measure = () => {
      frame = 0;
      const top = Math.max(
        toolbar.getBoundingClientRect().bottom,
        viewport.offsetTop,
      );
      const bottom = viewport.offsetTop + viewport.height;
      const bounds = body.getBoundingClientRect();
      const progress =
        bounds.bottom <= bottom + 1
          ? 1
          : bounds.top >= top
            ? 0
            : Math.max(
                0,
                Math.min(
                  1,
                  (top - bounds.top) / (bounds.height - (bottom - top)),
                ),
              );
      let activeId = null;
      for (const section of sections) {
        if (!section || section.getBoundingClientRect().top > top + 24) break;
        activeId = section.id;
      }
      toolbar.style.setProperty("--reader-panel-top", `${top}px`);
      toolbar.style.setProperty("--reader-view-bottom", `${bottom}px`);
      setPosition((previous) =>
        previous.progress === progress && previous.activeId === activeId
          ? previous
          : { progress, activeId },
      );
    };
    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(measure);
    }

    const observer = new ResizeObserver(schedule);
    observer.observe(body);
    observer.observe(toolbar);
    const header = document.querySelector("header.site-header");
    if (header) observer.observe(header);
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule, { passive: true });
    viewport.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      viewport.removeEventListener("resize", schedule);
    };
  }, [bodyId, outline]);

  return (
    <div className="reader-tools" ref={bar} role="group" aria-label="阅读工具">
      {isPost ? (
        <Suspense>
          <PostReturn card={card} />
        </Suspense>
      ) : (
        <ReturnLink href={`/projects/#${card}`} label="返回项目列表" />
      )}
      {outline.length >= 2 && (
        <Contents
          outline={outline}
          activeId={position.activeId}
          label={isPost ? "文章章节" : "项目章节"}
        />
      )}
      <div
        className="reader-progress"
        role="progressbar"
        aria-label="正文阅读进度"
        aria-valuenow={Math.floor(position.progress * 100)}
        style={{ transform: `scaleX(${position.progress})` }}
      />
    </div>
  );
}
