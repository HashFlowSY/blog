import Link from "next/link";

import { collectionCardId } from "@/lib/content-navigation";

import styles from "./post-archive.module.css";

import type { PostCardMeta } from "@/lib/content-catalog";
import type { PostSearchSnippet } from "@/lib/post-search";

interface PostCardProps {
  post: PostCardMeta;
  filterSearch?: string;
  snippet?: PostSearchSnippet | undefined;
  titleElement?: "h2" | "h3";
}

export function PostCard({
  post,
  filterSearch = "",
  snippet,
  titleElement: Title = "h2",
}: PostCardProps) {
  const cardId = collectionCardId("posts", post.slug);
  const titleId = `${cardId}-title`;
  const snippetId = snippet ? `${cardId}-snippet` : undefined;

  return (
    <article>
      <Link
        id={cardId}
        className="content-card-link article-card-link"
        href={`/posts/${post.slug}/${filterSearch}`}
        aria-labelledby={titleId}
        aria-describedby={snippetId}
      >
        <div className="article-card-copy">
          <p className="content-card-meta">
            <time dateTime={post.date}>{post.date.replaceAll("-", ".")}</time>
            <span>{post.tags[0]}</span>
            {post.readingMinutes > 0 && (
              <span>约 {post.readingMinutes} 分钟</span>
            )}
          </p>
          <Title id={titleId}>{post.title}</Title>
          <p className="content-card-summary">{post.summary}</p>
          {snippet && (
            <p
              className={`content-card-summary ${styles["snippet"]}`}
              id={snippetId}
            >
              正文：{snippet.before}
              <mark>{snippet.match}</mark>
              {snippet.after}
            </p>
          )}
        </div>
        <span className="content-card-action" aria-hidden="true">
          阅读 <span>→</span>
        </span>
      </Link>
    </article>
  );
}
