import Link from "next/link";

import { collectionCardId } from "@/lib/content-navigation";

import type { PostMeta } from "@/lib/content-catalog";

interface PostCardProps {
  post: PostMeta;
  filterSearch?: string;
  titleElement?: "h2" | "h3";
}

export function PostCard({
  post,
  filterSearch = "",
  titleElement: Title = "h2",
}: PostCardProps) {
  const cardId = collectionCardId("posts", post.slug);
  const titleId = `${cardId}-title`;

  return (
    <article>
      <Link
        id={cardId}
        className="content-card-link article-card-link"
        href={`/posts/${post.slug}/${filterSearch}`}
        aria-labelledby={titleId}
      >
        <div className="article-card-copy">
          <p className="content-card-meta">
            <time dateTime={post.date}>{post.date.replaceAll("-", ".")}</time>
            <span>{post.tags[0]}</span>
            <span>{post.readingTime} 分钟</span>
          </p>
          <Title id={titleId}>{post.title}</Title>
          <p className="content-card-summary">{post.summary}</p>
        </div>
        <span className="content-card-action" aria-hidden="true">
          阅读 <span>→</span>
        </span>
      </Link>
    </article>
  );
}
