import { PostCard } from "./post-card";

import type { PostMeta } from "@/lib/content-catalog";

interface PostArchiveProps {
  posts: PostMeta[];
  tags: string[];
}

export function PostArchive({ posts, tags }: PostArchiveProps) {
  const visibleTags = tags.slice(0, 6);

  return (
    <div className="portfolio-writing-archive">
      {visibleTags.length > 0 && (
        <div className="portfolio-topic-row" aria-label="当前写作主题">
          <span>当前主题</span>
          {visibleTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
      <div
        className="portfolio-article-list"
        aria-label="文章列表"
        data-od-id="article-list"
      >
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <PostCard index={index + 1} key={post.slug} post={post} />
          ))
        ) : (
          <p className="portfolio-empty-state">暂无文章</p>
        )}
      </div>
    </div>
  );
}
