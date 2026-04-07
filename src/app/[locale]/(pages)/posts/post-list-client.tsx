"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { FadeIn } from "@/components/motion/fade-in";
import { PostCard } from "@/components/post/post-card";
import { SearchBar } from "@/components/search";
import { TagFilter } from "@/components/tag";

import type { PostMeta } from "@/lib/posts";

interface PostListClientProps {
  posts: PostMeta[];
  tags: string[];
  emptyText: string;
  updatedLabel?: string;
  locale: string;
}

export function PostListClient({
  posts,
  tags,
  emptyText,
  updatedLabel,
  locale,
}: PostListClientProps) {
  const t = useTranslations("common");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [searchSlugs, setSearchSlugs] = useState<Set<string> | null>(null);

  const filtered = useMemo(() => {
    let filtered = posts;
    if (activeTag) {
      filtered = filtered.filter((p) => p.tags.includes(activeTag));
    }
    if (searchSlugs) {
      filtered = filtered.filter((p) => searchSlugs.has(p.slug));
    }
    return filtered;
  }, [posts, activeTag, searchSlugs]);

  const handleSearchResults = useMemo(
    () => (results: Array<{ slug: string }>) => {
      setSearchSlugs(
        results.length > 0 ? new Set(results.map((r) => r.slug)) : null,
      );
    },
    [],
  );

  return (
    <>
      <SearchBar
        locale={locale}
        placeholder={t("search")}
        noResultsText={t("noResults")}
        onResultsChange={handleSearchResults}
        className="mt-6"
      />

      <TagFilter
        tags={tags}
        activeTag={activeTag}
        onTagChange={setActiveTag}
        allLabel={t("all")}
        className="mt-4"
      />

      <div className="mt-8">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="grid gap-4">
            {filtered.map((post, i) => (
              <FadeIn key={post.slug} delay={i * 50}>
                <PostCard
                  post={post}
                  {...(updatedLabel !== undefined && { updatedLabel })}
                />
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
