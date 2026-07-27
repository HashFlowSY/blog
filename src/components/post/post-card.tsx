import Link from "next/link";

import type { PostMeta } from "@/lib/posts";

interface PostCardProps {
  index?: number;
  post: PostMeta;
}

function formatDateStamp(date: string): string {
  return date.replaceAll("-", ".");
}

export function PostCard({ index = 1, post }: PostCardProps) {
  const primaryTag = post.tags[0] ?? "Notes";

  return (
    <article className="portfolio-article-row" data-filter-item={primaryTag}>
      <span className="portfolio-article-index">
        {index.toString().padStart(2, "0")}
      </span>
      <div className="portfolio-article-copy">
        <p className="portfolio-overline">
          {formatDateStamp(post.date)} / {primaryTag} / {post.readingTime} min
        </p>
        <h2>
          <Link href={`/posts/${post.slug}/`}>{post.title}</Link>
        </h2>
        {post.summary && <p>{post.summary}</p>}
      </div>
      <Link
        className="portfolio-text-link"
        href={`/posts/${post.slug}/`}
        aria-label={`阅读${post.title}`}
      >
        阅读文章
      </Link>
    </article>
  );
}
