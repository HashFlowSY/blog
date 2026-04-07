const WORDS_PER_MINUTE = 200;

/**
 * Estimate reading time in minutes based on word count.
 * Returns at least 1 for any non-empty content.
 * CJK characters are counted individually as words.
 */
export function estimateReadingTime(text: string): number {
  if (!text.trim()) return 0;

  const wordCount = text
    // Split by whitespace to count words
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  if (wordCount === 0) return 0;

  // Round up, minimum 1 minute
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}
