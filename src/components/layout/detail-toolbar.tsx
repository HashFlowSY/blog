"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { readingProgress } from "@/components/post/reading-progress";
import {
  articleFilterSearch,
  collectionCardId,
} from "@/lib/content-navigation";

import { SectionNavigation } from "./section-navigation";

import type { ContentCollection } from "@/lib/content-navigation";
import type { MarkdownHeading } from "@/lib/markdown";

interface DetailToolbarProps {
  bodyId: string;
  collection: ContentCollection;
  slug: string;
  headings: readonly MarkdownHeading[];
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="detail-toolbar-control" href={href} replace>
      <span aria-hidden="true">←</span> {label}
    </Link>
  );
}

function ArticleBackLink({ cardId, label }: { cardId: string; label: string }) {
  const params = useSearchParams();
  const search = articleFilterSearch(
    params.get("q") ?? "",
    params.get("topic"),
  );
  return <BackLink href={`/posts/${search}#${cardId}`} label={label} />;
}

export function DetailToolbar({
  bodyId,
  collection,
  slug,
  headings,
}: DetailToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const cardId = collectionCardId(collection, slug);
  const isPost = collection === "posts";
  const label = isPost ? "返回文章列表" : "返回项目列表";

  useEffect(() => {
    const toolbar = toolbarRef.current;
    const body = document.getElementById(bodyId);
    const viewport = window.visualViewport;
    if (!toolbar || !body || !viewport) return;

    const sections = headings
      .map(({ id }) => document.getElementById(id))
      .filter((section) => section !== null);
    let frame: number | null = null;

    const measureReadingPosition = () => {
      frame = null;
      const toolbarBottom = toolbar.getBoundingClientRect().bottom;
      const viewportTop = viewport.offsetTop;
      const readingTop = Math.max(toolbarBottom, viewportTop);
      const readingBottom = viewportTop + viewport.height;
      const progress = readingProgress(
        body.getBoundingClientRect(),
        readingTop,
        readingBottom,
      );

      let current: string | null = null;
      for (const section of sections) {
        if (section.getBoundingClientRect().top > readingTop + 24) break;
        current = section.id;
      }

      toolbar.style.setProperty("--detail-toolbar-bottom", `${readingTop}px`);
      toolbar.style.setProperty(
        "--detail-viewport-bottom",
        `${readingBottom}px`,
      );
      toolbar.style.setProperty("--reading-progress", String(progress));
      setActiveId(current);
    };

    function requestMeasure() {
      if (frame === null)
        frame = window.requestAnimationFrame(measureReadingPosition);
    }

    const observer = new ResizeObserver(requestMeasure);
    observer.observe(body);
    if (toolbar.parentElement) observer.observe(toolbar.parentElement);
    requestMeasure();
    window.addEventListener("scroll", requestMeasure, { passive: true });
    window.addEventListener("resize", requestMeasure);
    viewport.addEventListener("scroll", requestMeasure, { passive: true });
    viewport.addEventListener("resize", requestMeasure);

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestMeasure);
      window.removeEventListener("resize", requestMeasure);
      viewport.removeEventListener("scroll", requestMeasure);
      viewport.removeEventListener("resize", requestMeasure);
    };
  }, [bodyId, headings]);

  return (
    <div className="detail-toolbar" ref={toolbarRef}>
      {isPost ? (
        <Suspense>
          <ArticleBackLink cardId={cardId} label={label} />
        </Suspense>
      ) : (
        <BackLink href={`/projects/#${cardId}`} label={label} />
      )}
      {headings.length >= 2 && (
        <SectionNavigation
          activeId={activeId}
          label={isPost ? "文章章节" : "项目章节"}
          headings={headings}
        />
      )}
      <div className="read-progress" aria-hidden="true" />
    </div>
  );
}
