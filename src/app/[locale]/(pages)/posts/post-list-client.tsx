"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { PostMeta } from "@/lib/posts";
import { PostCard } from "@/components/post/post-card";
import { cn } from "@/lib/utils";

interface PostListClientProps {
  posts: PostMeta[];
  tags: string[];
  emptyText: string;
  updatedLabel?: string;
}

export function PostListClient({
  posts,
  tags,
  emptyText,
  updatedLabel,
}: PostListClientProps) {
  const t = useTranslations("common");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(
    () => (activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts),
    [posts, activeTag],
  );

  return (
    <>
      {tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              activeTag === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground",
            )}
          >
            {t("all")}
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                activeTag === tag
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="grid gap-4">
            {filtered.map((post) => (
              <PostCard key={post.slug} post={post} updatedLabel={updatedLabel} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
