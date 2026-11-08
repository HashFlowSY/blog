"use client";

import { useState } from "react";

import { PostCard } from "./post-card";

import type { PostMeta } from "@/lib/content-catalog";

interface PostArchiveProps {
  posts: PostMeta[];
  tags: string[];
}

export function PostArchive({ posts, tags }: PostArchiveProps) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const searchTerm = query.trim().toLocaleLowerCase();
  const filteredPosts = posts.filter((post) => {
    if (selectedTag && !post.tags.includes(selectedTag)) return false;
    return (
      !searchTerm ||
      [post.title, post.summary, ...post.tags]
        .join(" ")
        .toLocaleLowerCase()
        .includes(searchTerm)
    );
  });
  const hasFilters = Boolean(query || selectedTag);

  function clearFilters() {
    setQuery("");
    setSelectedTag(null);
  }

  return (
    <div className="portfolio-writing-archive">
      <div className="archive-toolbar">
        <label className="archive-search">
          <span>查找文章</span>
          <input
            type="search"
            placeholder="标题、主题或关键词"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="archive-result-summary">
          <p className="archive-result-count" role="status">
            {hasFilters
              ? `${filteredPosts.length} / ${posts.length} 篇文章`
              : `共 ${posts.length} 篇文章`}
          </p>
          <button
            type="button"
            className="archive-clear"
            disabled={!hasFilters}
            onClick={clearFilters}
          >
            清除筛选
          </button>
        </div>
      </div>
      {tags.length > 0 && (
        <div className="portfolio-topic-row" aria-label="当前写作主题">
          <span>当前主题</span>
          <button
            type="button"
            aria-pressed={selectedTag === null}
            onClick={() => setSelectedTag(null)}
          >
            全部
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={selectedTag === tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <div
        key={`${selectedTag ?? "all"}-${searchTerm}`}
        className="portfolio-article-list"
        aria-label="文章列表"
        data-od-id="article-list"
      >
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post, index) => (
            <PostCard index={index + 1} key={post.slug} post={post} />
          ))
        ) : (
          <div className="portfolio-empty-state">
            <p>{posts.length === 0 ? "暂无文章" : "没有找到匹配的文章"}</p>
            {hasFilters && <p>换个关键词，或清除筛选查看全部文章。</p>}
          </div>
        )}
      </div>
    </div>
  );
}
