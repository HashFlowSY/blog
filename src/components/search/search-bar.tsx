"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import { useSearch } from "@/hooks/use-search";
import { Link } from "@/i18n/navigation";

import type { SearchResult } from "@/lib/search/search-types";

interface SearchBarProps {
  locale: string;
  placeholder?: string;
  noResultsText?: string;
  className?: string;
  onResultsChange?: (results: SearchResult[]) => void;
}

export function SearchBar({
  locale,
  placeholder = "Search...",
  noResultsText,
  className,
  onResultsChange,
}: SearchBarProps) {
  const { query, setQuery, results, isIndexLoading, clear } = useSearch(locale);

  // Notify parent of result changes
  useEffect(() => {
    onResultsChange?.(results);
  }, [results, onResultsChange]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev + 1;
          return next >= results.length ? 0 : next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? results.length - 1 : next;
        });
      } else if (e.key === "Enter") {
        setActiveIndex((prev) => {
          if (prev < 0 || prev >= results.length) return prev;
          e.preventDefault();
          const activeLink =
            listboxRef.current?.querySelector<HTMLAnchorElement>(
              `[data-option-index="${prev}"] a`,
            );
          if (activeLink) {
            activeLink.click();
          }
          return prev;
        });
      }
    },
    [isOpen, results.length],
  );

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setActiveIndex(-1);
        containerRef.current?.querySelector("input")?.blur();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const hasResults = results.length > 0;
  const showNoResults = query.trim() !== "" && !isIndexLoading && !hasResults;
  const activeId =
    activeIndex >= 0 && activeIndex < results.length
      ? `search-option-${activeIndex}`
      : undefined;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen && (hasResults || showNoResults)}
          aria-controls="search-results"
          aria-activedescendant={activeId}
          aria-label="Search posts"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              clear();
              setIsOpen(false);
              setActiveIndex(-1);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {(hasResults || showNoResults) && isOpen && (
        <div
          id="search-results"
          role="listbox"
          ref={listboxRef}
          className="absolute top-full z-50 mt-1 w-full rounded-lg border border-border bg-popover p-2 shadow-md"
        >
          {isIndexLoading && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {placeholder}...
            </p>
          )}

          {hasResults && (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((result: SearchResult, index: number) => (
                <li
                  key={result.slug}
                  id={`search-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  data-option-index={index}
                  className={
                    index === activeIndex ? "rounded-md bg-accent" : ""
                  }
                >
                  <Link
                    href={`/posts/${result.slug}/`}
                    className="block rounded-md px-3 py-2 transition-colors"
                    onClick={() => {
                      setIsOpen(false);
                      setActiveIndex(-1);
                    }}
                  >
                    <div className="font-medium text-sm">{result.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {result.summary}
                    </div>
                    {result.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {result.tags.map((tag) => (
                          <span
                            key={tag}
                            data-testid="search-tag"
                            className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {showNoResults && noResultsText && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {noResultsText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
