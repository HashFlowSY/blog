import { afterEach, describe, expect, it, vi } from "vitest";

import { loadPostSearchIndex, searchPosts } from "./post-search";

import type { PostCardMeta } from "./content-catalog";

function post(slug: string, fields: Partial<PostCardMeta> = {}): PostCardMeta {
  return {
    slug,
    title: "工程手记",
    summary: "摘要",
    date: "2026-04-01",
    tags: ["工程"],
    readingTime: 2,
    ...fields,
  };
}

describe("searchPosts", () => {
  it("ranks title, summary or topic, then body and keeps newest results first within each group", () => {
    const posts = [
      post("body", { date: "2026-08-01" }),
      post("title-old", { title: "月抛站相关", date: "2026-01-01" }),
      post("topic", { tags: ["月抛站"], date: "2026-07-01" }),
      post("summary", { summary: "包含月抛站" }),
      post("title-new", { title: "关于月抛站", date: "2026-02-01" }),
    ];
    const blocks = new Map(
      posts.map(({ slug }) => [slug, ["月抛站仅存在于正文。"]]),
    );

    expect(
      searchPosts(posts, " 月抛站 ", blocks).map(({ post: { slug } }) => slug),
    ).toEqual(["title-new", "title-old", "topic", "summary", "body"]);
  });

  it("matches literal symbols and shows original casing without splitting Unicode characters", () => {
    const blocks = new Map([
      ["body", [`${"😃".repeat(40)} C++ <Sample> ${"字".repeat(75)}`]],
    ]);
    const [match] = searchPosts([post("body")], "c++   <sample>", blocks);

    expect(match?.snippet?.before).toMatch(/^…(?:😃)+ $/u);
    expect(match?.snippet?.match).toBe("C++ <Sample>");
    expect(match?.snippet?.after).toMatch(/^ 字+…$/u);
    expect(searchPosts([post("body")], ".*", blocks)).toEqual([]);
  });
});

describe("loadPostSearchIndex", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects malformed rows and index entries that do not match the published archive", async () => {
    const url = "/blog/valid-index.json";
    const posts = [{ slug: "sample" }];
    const fetchIndex = vi
      .fn()
      .mockResolvedValueOnce(Response.json([{ slug: "sample", blocks: [1] }]))
      .mockResolvedValueOnce(Response.json([{ slug: "another", blocks: [] }]))
      .mockResolvedValueOnce(
        Response.json([{ slug: "sample", blocks: ["正文"] }]),
      );
    vi.stubGlobal("fetch", fetchIndex);

    await expect(loadPostSearchIndex(url, posts)).rejects.toThrow(
      "Invalid article search index entry",
    );
    await expect(loadPostSearchIndex(url, posts)).rejects.toThrow(
      "Article search index does not match the archive",
    );
    expect((await loadPostSearchIndex(url, posts)).get("sample")).toEqual([
      "正文",
    ]);
    expect(fetchIndex).toHaveBeenCalledTimes(3);
  });
});
