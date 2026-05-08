"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PostCard } from "./post-card";

import type { PostMeta } from "@/lib/posts";

interface PostArchiveProps {
  posts: PostMeta[];
  tags: string[];
}

export function PostArchive({ posts, tags }: PostArchiveProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const filteredPosts = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((post) => post.tags.includes(activeTag));
  }, [activeTag, posts]);

  return (
    <div className="archive-layout">
      <aside className="archive-panel" aria-label="文章筛选">
        <p className="archive-title">索引柜</p>
        <div className="filter-group" data-filter-scope="articles">
          <button
            className="filter-button"
            type="button"
            aria-pressed={activeTag === null}
            onClick={() => setActiveTag(null)}
          >
            全部 <span>{posts.length.toString().padStart(2, "0")}</span>
          </button>
          {tags.map((tag) => {
            const count = posts.filter((post) =>
              post.tags.includes(tag),
            ).length;
            return (
              <button
                key={tag}
                className="filter-button"
                type="button"
                aria-pressed={activeTag === tag}
                onClick={() => setActiveTag(tag)}
              >
                {tag} <span>{count.toString().padStart(2, "0")}</span>
              </button>
            );
          })}
        </div>
      </aside>
      <div>
        <div
          className="article-list"
          aria-label="文章列表"
          data-od-id="article-list"
        >
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))
          ) : (
            <p className="empty-state">暂无文章</p>
          )}
        </div>
        {posts.length > 0 && (
          <section className="section-block" aria-labelledby="related-title">
            <div className="section-heading">
              <h2 id="related-title">关联阅读</h2>
              <p>三张关联卡片保持报纸副刊式密度，用标题和摘要承担导航。</p>
            </div>
            <div className="related-grid" data-od-id="related-grid">
              {posts.slice(0, 3).map((post) => (
                <Link
                  key={post.slug}
                  className="related-card"
                  href={`/posts/${post.slug}/`}
                >
                  <span className="related-thumb" aria-hidden="true" />
                  <span className="meta">{post.date.replaceAll("-", ".")}</span>
                  <h3>{post.title}</h3>
                  <p>{post.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
