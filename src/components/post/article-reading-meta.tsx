import type { ReadingStats } from "@/lib/markdown/model";

export function ArticleReadingMeta({
  stats: { cjkCharacters, otherWords, minutes },
}: {
  stats: ReadingStats;
}) {
  if (!minutes) return null;
  const units = [
    cjkCharacters > 0 && `${cjkCharacters} 字`,
    otherWords > 0 && `${otherWords} 词`,
  ].filter(Boolean);
  return <span>{`正文 ${units.join(" · ")} · 约 ${minutes} 分钟`}</span>;
}
