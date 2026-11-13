import { expect, it } from "vitest";

import { relatedReading } from "./related-reading";

import type { Post } from "./content-catalog";

function post(slug: string, date: string, tags: Post["tags"]) {
  return { slug, date, tags };
}

it("returns up to three matching posts ordered by tag count, date distance, date and slug", () => {
  const current = post("current", "2026-03-15", ["React", "CSS"]);
  const posts = [
    current,
    post("z-close", "2026-03-16", ["React"]),
    post("a-close", "2026-03-16", ["React"]),
    post("before", "2026-03-14", ["React"]),
    post("more-tags", "2026-02-15", ["React", "CSS"]),
    post("unrelated", "2026-03-15", ["Next"]),
  ];
  const result = relatedReading(current, posts);
  expect(result.title).toBe("关联阅读");
  expect(result.posts.map(({ slug }) => slug)).toEqual([
    "more-tags",
    "a-close",
    "z-close",
  ]);
});

it("offers latest posts when there are no shared tags and no recommendation when alone", () => {
  const current = post("current", "2026-03-15", ["CSS"]);
  const newer = post("newer", "2026-06-01", ["React"]);
  const older = post("older", "2026-04-01", ["React"]);
  expect(relatedReading(current, [older, current, newer])).toEqual({
    title: "最新文章",
    posts: [newer, older],
  });
  expect(relatedReading(current, [current]).posts).toEqual([]);
});
