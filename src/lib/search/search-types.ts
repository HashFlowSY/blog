export interface SearchIndexEntry {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  content: string;
  locale: string;
}

export interface SearchResult {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  locale: string;
  score: number;
}
