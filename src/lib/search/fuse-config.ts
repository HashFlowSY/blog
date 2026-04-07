import Fuse, { type IFuseOptions } from "fuse.js";

import type { SearchIndexEntry } from "./search-types";

const FUSE_OPTIONS: IFuseOptions<SearchIndexEntry> = {
  keys: [
    { name: "title", weight: 0.4 },
    { name: "summary", weight: 0.25 },
    { name: "tags", weight: 0.2 },
    { name: "content", weight: 0.15 },
  ],
  threshold: 0.3,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  ignoreLocation: true,
};

/**
 * Create a Fuse.js search engine pre-filtered to the given locale.
 */
export function createSearchEngine(
  entries: SearchIndexEntry[],
  locale: string,
): Fuse<SearchIndexEntry> {
  const localeEntries = entries.filter((e) => e.locale === locale);
  return new Fuse(localeEntries, FUSE_OPTIONS);
}
