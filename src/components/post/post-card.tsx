import Link from "next/link";

import type { PostMeta } from "@/lib/posts";

interface PostCardProps {
  post: PostMeta;
}

function formatDateStamp(date: string): string[] {
  const [year = "----", month = "--", day = "--"] = date.split("-");
  return [year, `${month}.${day}`];
}

export function PostCard({ post }: PostCardProps) {
  const [year, day] = formatDateStamp(post.date);
  const primaryTag = post.tags[0] ?? "Notes";

  return (
    <article className="article-card" data-filter-item={primaryTag}>
      <div className="date-stamp">
        {year}
        <br />
        {day}
      </div>
      <div>
        <p className="meta">
          {primaryTag} / {post.readingTime} min
        </p>
        <h3>
          <Link href={`/posts/${post.slug}/`}>{post.title}</Link>
        </h3>
        {post.summary && <p>{post.summary}</p>}
      </div>
    </article>
  );
}
