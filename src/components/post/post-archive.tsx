"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { CollectionReturnFocus } from "@/components/layout/collection-return-focus";
import { articleFilterSearch } from "@/lib/content-navigation";

import { PostCard } from "./post-card";

import type { PostMeta } from "@/lib/content-catalog";

interface PostArchiveProps {
  posts: PostMeta[];
  tags: string[];
}

function ArchiveSearchSync({
  onChange,
}: {
  onChange: (search: string) => void;
}) {
  const search = useSearchParams().toString();

  useEffect(() => {
    onChange(window.location.search);
  }, [onChange, search]);

  return null;
}

export function PostArchive({ posts, tags }: PostArchiveProps) {
  const [search, setSearch] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const params = new URLSearchParams(search);
  const query = params.get("q") ?? "";
  const topic = params.get("topic");
  const selectedTag = topic && tags.includes(topic) ? topic : null;
  const filterSearch = articleFilterSearch(query, selectedTag);
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

  function updateFilters(nextQuery: string, nextTag: string | null) {
    const nextSearch = articleFilterSearch(nextQuery, nextTag);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + nextSearch,
    );
    setSearch(nextSearch);
  }

  return (
    <>
      <Suspense fallback={null}>
        <ArchiveSearchSync onChange={setSearch} />
      </Suspense>
      <div className="archive-toolbar">
        <label className="archive-search">
          <span>查找文章</span>
          <input
            ref={searchInput}
            type="search"
            placeholder="标题、主题或关键词"
            value={query}
            onChange={(event) => updateFilters(event.target.value, selectedTag)}
          />
        </label>
        {tags.length > 0 && (
          <div className="archive-topics">
            <span id="archive-topics-label">主题</span>
            <div
              className="portfolio-topic-row"
              role="group"
              aria-labelledby="archive-topics-label"
            >
              <button
                type="button"
                aria-pressed={selectedTag === null}
                onClick={() => updateFilters(query, null)}
              >
                全部
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selectedTag === tag}
                  onClick={() =>
                    updateFilters(query, selectedTag === tag ? null : tag)
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
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
          onClick={() => {
            updateFilters("", null);
            searchInput.current?.focus();
          }}
        >
          清除筛选
        </button>
      </div>
      <div className="portfolio-article-list">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostCard key={post.slug} post={post} filterSearch={filterSearch} />
          ))
        ) : (
          <div className="portfolio-empty-state">
            <p>{posts.length === 0 ? "暂无文章" : "没有找到匹配的文章"}</p>
            {hasFilters && <p>换个关键词，或清除筛选查看全部文章。</p>}
          </div>
        )}
      </div>
      <CollectionReturnFocus collection="posts" search={search} />
    </>
  );
}
