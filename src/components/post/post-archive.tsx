"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";

import { articleFilterSearch } from "@/lib/content-navigation";
import { loadPostSearchIndex, searchPosts } from "@/lib/post-search";

import styles from "./post-archive.module.css";
import { PostCard } from "./post-card";

import type { PostCardMeta } from "@/lib/content-catalog";
import type { PostSearchBlocks, PostSearchResult } from "@/lib/post-search";

interface PostArchiveProps {
  posts: readonly PostCardMeta[];
  tags: readonly string[];
  indexUrl: string;
}

type SearchIndex = PostSearchBlocks | "unavailable" | null;

type ArchiveResults =
  | { kind: "loading" | "error" }
  | { kind: "ready"; matches: PostSearchResult[] };

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

export function PostArchive({ posts, tags, indexUrl }: PostArchiveProps) {
  const [search, setSearch] = useState("");
  const [index, setIndex] = useState<SearchIndex>(null);
  const [composition, setComposition] = useState<string | null>(null);
  const isComposing = useRef(false);
  const indexRequest = useRef<Promise<PostSearchBlocks> | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const previousRows = useRef<Map<HTMLElement, number> | null>(null);
  const params = new URLSearchParams(search);
  const query = params.get("q") ?? "";
  const topic = params.get("topic");
  const selectedTag = topic && tags.includes(topic) ? topic : null;
  const filterSearch = articleFilterSearch(query, selectedTag);
  const keyword = query.trim();
  const candidates = selectedTag
    ? posts.filter((post) => post.tags.includes(selectedTag))
    : posts;
  let results: ArchiveResults;
  if (!keyword || posts.length === 0) {
    results = { kind: "ready", matches: candidates.map((post) => ({ post })) };
  } else if (index === null) {
    results = { kind: "loading" };
  } else if (index === "unavailable") {
    results = { kind: "error" };
  } else {
    results = {
      kind: "ready",
      matches: searchPosts(candidates, keyword, index),
    };
  }
  const hasFilters = Boolean(query || selectedTag);
  const loadingIndex = results.kind === "loading";
  const noMatches =
    results.kind === "ready" &&
    posts.length > 0 &&
    results.matches.length === 0;
  const hasMatches = results.kind === "ready" && results.matches.length > 0;

  useLayoutEffect(() => {
    const previous = previousRows.current;
    previousRows.current = null;
    if (!previous || !list.current) return;
    const media = window.matchMedia("(prefers-reduced-motion: no-preference)");
    if (!media.matches) return;

    const listTop = list.current.getBoundingClientRect().top;
    const animations: Animation[] = [];
    for (const [row, oldTop] of previous) {
      if (!row.isConnected) continue;
      const offset = oldTop - (row.getBoundingClientRect().top - listTop);
      if (Math.abs(offset) < 1) continue;
      animations.push(
        row.animate(
          [{ transform: `translateY(${offset}px)` }, { transform: "none" }],
          { duration: 200, easing: "cubic-bezier(.25,.72,.28,1)" },
        ),
      );
    }
    const stop = () => animations.forEach((animation) => animation.cancel());
    media.addEventListener("change", stop);
    return () => {
      media.removeEventListener("change", stop);
      stop();
    };
  }, [search]);

  useEffect(() => {
    if (!hasMatches) return;
    const frame = window.requestAnimationFrame(() => {
      if (search !== window.location.search) return;
      const id = window.location.hash.slice(1);
      if (!id.startsWith("posts-")) return;
      const card = document.getElementById(id);
      if (!(card instanceof HTMLAnchorElement)) return;
      card.focus({ preventScroll: true });
      card.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasMatches, search]);

  useEffect(() => {
    if (!loadingIndex) return;

    const request = (indexRequest.current ??= loadPostSearchIndex(
      indexUrl,
      posts,
    ));
    let subscribed = true;
    void request.then(
      (blocks) => {
        if (subscribed) {
          indexRequest.current = null;
          setIndex(blocks);
        }
      },
      () => {
        if (subscribed) {
          indexRequest.current = null;
          setIndex("unavailable");
        }
      },
    );
    return () => {
      subscribed = false;
    };
  }, [indexUrl, loadingIndex, posts]);

  function updateFilters(nextQuery: string, nextTag: string | null) {
    const nextSearch = articleFilterSearch(nextQuery, nextTag);
    const rows = list.current;
    previousRows.current = null;
    if (
      rows &&
      nextQuery === query &&
      nextTag !== selectedTag &&
      typeof rows.animate === "function" &&
      window.matchMedia?.("(prefers-reduced-motion: no-preference)").matches
    ) {
      const listTop = rows.getBoundingClientRect().top;
      previousRows.current = new Map(
        Array.from(
          rows.querySelectorAll<HTMLElement>(":scope > article"),
          (row) => [row, row.getBoundingClientRect().top - listTop],
        ),
      );
    }
    if (window.location.search !== nextSearch || window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + nextSearch,
      );
    }
    setSearch(nextSearch);
  }

  function clearFilters() {
    isComposing.current = false;
    setComposition(null);
    updateFilters("", null);
    searchInput.current?.focus();
  }

  const clearButton = (
    <button type="button" className="archive-clear" onClick={clearFilters}>
      清除筛选
    </button>
  );

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
            placeholder="标题、主题或正文关键词"
            value={composition ?? query}
            onCompositionStart={(event) => {
              isComposing.current = true;
              setComposition(event.currentTarget.value);
            }}
            onCompositionEnd={(event) => {
              isComposing.current = false;
              setComposition(null);
              updateFilters(event.currentTarget.value, selectedTag);
            }}
            onChange={(event) => {
              const { value } = event.currentTarget;
              if (isComposing.current) setComposition(value);
              else updateFilters(value, selectedTag);
            }}
          />
        </label>
        {tags.length > 0 && (
          <div className="archive-topics">
            <span id="archive-topics-label" className="sr-only">
              主题
            </span>
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
          {results.kind === "ready"
            ? hasFilters
              ? `${results.matches.length} / ${posts.length} 篇文章`
              : `共 ${posts.length} 篇文章`
            : results.kind === "loading"
              ? "正在搜索文章…"
              : "无法加载文章搜索索引。"}
        </p>
        {hasFilters && !noMatches && (
          <div className={styles["actions"]}>
            {results.kind === "error" && (
              <button
                type="button"
                className="archive-clear"
                onClick={() => {
                  setIndex(null);
                  searchInput.current?.focus();
                }}
              >
                重试搜索
              </button>
            )}
            {clearButton}
          </div>
        )}
      </div>
      <div
        ref={list}
        className="portfolio-article-list"
        aria-busy={loadingIndex}
      >
        {results.kind === "ready" &&
          results.matches.map(({ post, snippet }) => (
            <PostCard
              key={post.slug}
              post={post}
              filterSearch={filterSearch}
              snippet={snippet}
            />
          ))}
        {posts.length === 0 && (
          <div className="portfolio-empty-state">暂无文章</div>
        )}
        {noMatches && (
          <div className={`portfolio-empty-state ${styles["empty"]}`}>
            <p>没有找到匹配的文章</p>
            <div className={styles["actions"]}>
              {selectedTag && (
                <button
                  type="button"
                  className="archive-clear"
                  onClick={() => {
                    updateFilters(query, null);
                    searchInput.current?.focus();
                  }}
                >
                  仅取消主题
                </button>
              )}
              {clearButton}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
