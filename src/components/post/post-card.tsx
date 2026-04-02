import type { PostMeta } from "@/lib/posts";
import { Link } from "@/i18n/navigation";

interface PostCardProps {
  post: PostMeta;
  updatedLabel?: string;
}

export function PostCard({ post, updatedLabel }: PostCardProps) {
  return (
    <article className="group">
      <Link href={`/posts/${post.slug}/`} className="block">
        <div className="rounded-lg border border-border p-4 transition-colors hover:bg-accent">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <time dateTime={post.date}>{post.date}</time>
            {post.updated !== post.date && updatedLabel && (
              <span>({updatedLabel} {post.updated})</span>
            )}
          </div>
          <h3 className="text-lg font-semibold group-hover:opacity-80 transition-opacity">
            {post.title}
          </h3>
          {post.summary && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {post.summary}
            </p>
          )}
          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
