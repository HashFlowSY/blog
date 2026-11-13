import type { Post } from "./content-catalog";

type RankablePost = Pick<Post, "slug" | "date" | "tags">;

const maximumRecommendations = 3;

function latest(first: RankablePost, second: RankablePost) {
  return (
    second.date.localeCompare(first.date) ||
    first.slug.localeCompare(second.slug)
  );
}

function timestamp(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

export function relatedReading<T extends RankablePost>(
  current: RankablePost,
  posts: readonly T[],
) {
  const others = posts.filter(({ slug }) => slug !== current.slug);
  const currentTags = new Set(current.tags);
  const date = timestamp(current.date);
  const related = others
    .map((post) => ({
      post,
      commonTags: post.tags.filter((tag) => currentTags.has(tag)).length,
      distance: Math.abs(timestamp(post.date) - date),
    }))
    .filter(({ commonTags }) => commonTags > 0);

  if (related.length === 0) {
    return {
      title: "最新文章",
      posts: others.sort(latest).slice(0, maximumRecommendations),
    };
  }
  related.sort(
    (a, b) =>
      b.commonTags - a.commonTags ||
      a.distance - b.distance ||
      latest(a.post, b.post),
  );
  return {
    title: "关联阅读",
    posts: related.slice(0, maximumRecommendations).map(({ post }) => post),
  };
}
