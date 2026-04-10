import { TagBadge } from "@/components/tag";
import { Link } from "@/i18n/navigation";

import type { PostMeta } from "@/lib/posts";

interface PostCardProps {
  post: PostMeta;
  updatedLabel?: string;
  minutesLabel?: string;
}

export function PostCard({ post, updatedLabel, minutesLabel }: PostCardProps) {
  return (
    <article className="group">
      <Link href={`/posts/${post.slug}/`} className="block">
        <div className="rounded-lg border border-border p-4 transition-all duration-200 hover:bg-accent hover:-translate-y-0.5 hover:shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <time dateTime={post.date}>{post.date}</time>
            {post.readingTime > 0 && minutesLabel && (
              <span>
                {post.readingTime} {minutesLabel}
              </span>
            )}
            {post.updated !== post.date && updatedLabel && (
              <span>
                ({updatedLabel} {post.updated})
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold group-hover:opacity-80 transition-opacity">
            {post.title}
          </h2>
          {post.summary && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {post.summary}
            </p>
          )}
          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {post.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
