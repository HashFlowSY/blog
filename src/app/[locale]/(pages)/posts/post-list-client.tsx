"use client";

import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";

import { PostCard } from "@/components/post/post-card";
import { TagFilter } from "@/components/tag";

import type { PostMeta } from "@/lib/posts";

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
      <TagFilter
        tags={tags}
        activeTag={activeTag}
        onTagChange={setActiveTag}
        allLabel={t("all")}
        className="mt-6"
      />

      <div className="mt-8">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="grid gap-4">
            {filtered.map((post) => (
              <PostCard
                key={post.slug}
                post={post}
                {...(updatedLabel !== undefined && { updatedLabel })}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
