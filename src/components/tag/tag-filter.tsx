"use client";

import { cn } from "@/lib/utils";

interface TagFilterProps {
  tags: string[];
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  allLabel: string;
  className?: string;
}

export function TagFilter({
  tags,
  activeTag,
  onTagChange,
  allLabel,
  className,
}: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <button
        onClick={() => onTagChange(null)}
        className={cn(
          "rounded-full border px-3 py-1 text-sm transition-colors",
          activeTag === null
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground",
        )}
      >
        {allLabel}
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onTagChange(tag === activeTag ? null : tag)}
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
  );
}
