"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ReadingProgress } from "@/components/post/reading-progress";
import {
  articleFilterSearch,
  collectionCardId,
} from "@/lib/content-navigation";

import { SectionNavigation } from "./section-navigation";

import type { ContentCollection } from "@/lib/content-navigation";
import type { MarkdownHeading } from "@/lib/markdown";

interface DetailToolbarProps {
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
  collection,
  slug,
  headings,
}: DetailToolbarProps) {
  const cardId = collectionCardId(collection, slug);
  const isPost = collection === "posts";
  const label = isPost ? "返回文章列表" : "返回项目列表";
  const backLink = (
    <BackLink href={`/${collection}/#${cardId}`} label={label} />
  );

  return (
    <div className="detail-toolbar">
      {isPost ? (
        <Suspense fallback={backLink}>
          <ArticleBackLink cardId={cardId} label={label} />
        </Suspense>
      ) : (
        backLink
      )}
      {headings.length >= 2 && (
        <SectionNavigation
          label={isPost ? "文章章节" : "项目章节"}
          headings={headings}
        />
      )}
      <ReadingProgress />
    </div>
  );
}
