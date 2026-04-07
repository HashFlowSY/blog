const DEFAULT_MAX_LENGTH = 2000;

/**
 * Strip HTML tags, decode common entities, collapse whitespace,
 * and optionally truncate the result.
 *
 * Works in both Node.js (build-time) and browser environments.
 */
export function stripHtml(html: string, maxLen = DEFAULT_MAX_LENGTH): string {
  if (!html) return "";

  // Decode common HTML entities
  const decoded = html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");

  // Strip all HTML tags
  const text = decoded.replace(/<[^>]*>/g, " ");

  // Collapse whitespace
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) return "";

  return normalized.length > maxLen
    ? `${normalized.slice(0, maxLen)}…`
    : normalized;
}
