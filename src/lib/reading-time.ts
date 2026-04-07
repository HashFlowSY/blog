const WORDS_PER_MINUTE = 200;
const CJK_CHARS_PER_MINUTE = 500;

/** Match CJK Unified Ideographs and common CJK punctuation ranges. */
const CJK_RANGE =
  /[\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u3100-\u312F\u3130-\u318F\u3190-\u319F\u31C0-\u31EF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4DC0-\u4DFF\u4E00-\u9FFF\uA000-\uA48F\uA490-\uA4CF\uAC00-\uD7AF\uD7B0-\uD7FF\uF900-\uFAFF\uFE10-\uFE1F\uFE30-\uFE4F]/g;

/**
 * Estimate reading time in minutes based on word count.
 * Returns at least 1 for any non-empty content.
 * CJK characters are counted individually at a slower reading rate.
 */
export function estimateReadingTime(text: string): number {
  if (!text.trim()) return 0;

  // Count CJK characters individually
  const cjkMatches = text.match(CJK_RANGE);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  // Remove CJK characters, then count remaining words by whitespace
  const nonCjkText = text.replace(CJK_RANGE, " ");
  const wordCount = nonCjkText.split(/\s+/).filter((w) => w.length > 0).length;

  // Weighted total: CJK chars count at their own rate, words at English rate
  const minutes =
    wordCount / WORDS_PER_MINUTE + cjkCount / CJK_CHARS_PER_MINUTE;

  if (minutes === 0) return 0;

  // Round up, minimum 1 minute
  return Math.max(1, Math.ceil(minutes));
}
