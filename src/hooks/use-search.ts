"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSearchEngine } from "@/lib/search/fuse-config";

import type { SearchIndexEntry, SearchResult } from "@/lib/search/search-types";

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isIndexLoading: boolean;
  error: string | null;
  clear: () => void;
}

const DEBOUNCE_MS = 200;

/**
 * Client-side search hook with lazy index loading and debounced queries.
 *
 * The search index is fetched from /search-index.json only on first interaction.
 * Subsequent queries reuse the cached Fuse.js instance.
 */
export function useSearch(locale: string): UseSearchReturn {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isIndexLoading, setIsIndexLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fuseRef = useRef<ReturnType<typeof createSearchEngine> | null>(null);
  const fuseLocaleRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Main effect: load index on first query, debounce subsequent searches
  useEffect(() => {
    // Invalidate cache when locale changes
    if (fuseLocaleRef.current !== locale) {
      fuseRef.current = null;
      fuseLocaleRef.current = locale;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!query.trim()) {
      return;
    }

    // Index not loaded yet — fetch it, then search immediately
    if (!fuseRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching effect: loading state set before async fetch
      setIsIndexLoading(true);
      setError(null);

      fetch("/search-index.json")
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<SearchIndexEntry[]>;
        })
        .then((data) => {
          if (!mountedRef.current) return;
          fuseRef.current = createSearchEngine(data, locale);
          setIsIndexLoading(false);
          // Search immediately with the current query
          const fuseResults = fuseRef.current.search(query.trim());
          const mapped: SearchResult[] = fuseResults
            .map((r) => ({
              slug: r.item.slug,
              title: r.item.title,
              summary: r.item.summary,
              tags: r.item.tags,
              locale: r.item.locale,
              score: r.score ?? 1,
            }))
            .sort((a, b) => a.score - b.score);
          setResults(mapped);
        })
        .catch((err: unknown) => {
          if (!mountedRef.current) return;
          const message =
            err instanceof Error ? err.message : "Failed to load search index";
          setError(message);
          setIsIndexLoading(false);
        });

      return undefined;
    }

    // Index already loaded — debounce the search
    debounceRef.current = setTimeout(() => {
      if (!fuseRef.current || !mountedRef.current) return;

      const fuseResults = fuseRef.current.search(query.trim());
      const mapped: SearchResult[] = fuseResults
        .map((r) => ({
          slug: r.item.slug,
          title: r.item.title,
          summary: r.item.summary,
          tags: r.item.tags,
          locale: r.item.locale,
          score: r.score ?? 1,
        }))
        .sort((a, b) => a.score - b.score);

      setResults(mapped);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [query, locale]);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    if (!value.trim()) {
      setResults([]);
    }
  }, []);

  const clear = useCallback(() => {
    setQueryState("");
    setResults([]);
  }, []);

  return useMemo(
    () => ({
      query,
      setQuery,
      results,
      isIndexLoading,
      error,
      clear,
    }),
    [query, setQuery, results, isIndexLoading, error, clear],
  );
}
