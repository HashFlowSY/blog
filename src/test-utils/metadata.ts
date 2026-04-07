import type { Metadata } from "next";

/**
 * Access OpenGraph discriminated union properties in tests.
 *
 * Next.js Metadata.openGraph is typed as a union (OpenGraphWebsite | OpenGraphArticle | ... | OpenGraphMetadata).
 * TypeScript cannot narrow the union from a Metadata return value, so we cast to a flat type
 * for property assertions in tests.
 */
type TestOpenGraph = {
  type?: string;
  title?: string;
  description?: string;
  siteName?: string;
  locale?: string;
  url?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[] | string | null;
};

type TestTwitter = {
  card?: string;
  site?: string;
  title?: string;
  description?: string;
};

export function og(m: Metadata) {
  return m.openGraph as TestOpenGraph | null | undefined;
}

export function tw(m: Metadata) {
  return m.twitter as TestTwitter | null | undefined;
}
