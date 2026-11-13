import { ReadingBackToTop } from "@/components/layout/back-to-top";
import { DetailToolbar } from "@/components/layout/detail-toolbar";
import { SITE } from "@/lib/site";

import { CodeBlockEnhancer } from "./code-block";
import { PostCard } from "./post-card";

import type { Post, PostMeta } from "@/lib/content-catalog";
interface PostDetailTemplateProps {
  post: Post;
  relatedPosts: PostMeta[];
  relatedTitle?: string;
}

export interface RelatedReadingSelection {
  posts: PostMeta[];
  title: "关联阅读" | "最新文章";
}

function formatDetailDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return date.replaceAll("-", ".");
}

export function selectRelatedReading(
  currentSlug: string,
  posts: PostMeta[],
  limit = 3,
): RelatedReadingSelection {
  const currentPost = posts.find((item) => item.slug === currentSlug);
  const candidates = posts.filter((item) => item.slug !== currentSlug);

  if (!currentPost) {
    return {
      posts: [...candidates].sort(compareByLatestDate).slice(0, limit),
      title: "最新文章",
    };
  }

  const taggedCandidates = candidates
    .map((candidate) => ({
      post: candidate,
      sharedTagCount: countSharedTags(currentPost, candidate),
    }))
    .filter((candidate) => candidate.sharedTagCount > 0);

  if (taggedCandidates.length === 0) {
    return {
      posts: [...candidates].sort(compareByLatestDate).slice(0, limit),
      title: "最新文章",
    };
  }

  return {
    posts: [...taggedCandidates]
      .sort((a, b) => {
        const sharedTagDelta = b.sharedTagCount - a.sharedTagCount;
        if (sharedTagDelta !== 0) return sharedTagDelta;

        const distanceDelta =
          getDateDistance(a.post.date, currentPost.date) -
          getDateDistance(b.post.date, currentPost.date);
        if (distanceDelta !== 0) return distanceDelta;

        return compareByLatestDate(a.post, b.post);
      })
      .map((candidate) => candidate.post)
      .slice(0, limit),
    title: "关联阅读",
  };
}

function compareByLatestDate(a: PostMeta, b: PostMeta): number {
  const aTimestamp = getDateTimestamp(a.date) ?? Number.NEGATIVE_INFINITY;
  const bTimestamp = getDateTimestamp(b.date) ?? Number.NEGATIVE_INFINITY;
  const dateDelta = bTimestamp - aTimestamp;
  if (dateDelta !== 0) return dateDelta;

  return a.slug.localeCompare(b.slug);
}

function countSharedTags(currentPost: PostMeta, candidate: PostMeta): number {
  const currentTags = new Set(currentPost.tags);
  const sharedTags = new Set(
    candidate.tags.filter((tag) => currentTags.has(tag)),
  );

  return sharedTags.size;
}

function getDateDistance(a: string, b: string): number {
  const aTimestamp = getDateTimestamp(a);
  const bTimestamp = getDateTimestamp(b);
  if (aTimestamp === null || bTimestamp === null) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(aTimestamp - bTimestamp);
}

function getDateTimestamp(date: string): number | null {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function PostDetailTemplate({
  post,
  relatedPosts,
  relatedTitle = "关联阅读",
}: PostDetailTemplateProps) {
  const tags = post.tags;
  const { headings, html } = post.renderedContent;
  const titleParts = post.title.match(/^(.+?(?:：|:\s)\s*)(\S.*)$/u);

  return (
    <article
      className="portfolio-page content-page content-detail-page"
      aria-labelledby="post-title"
    >
      <div className="portfolio-shell">
        <DetailToolbar
          bodyId="article-body"
          collection="posts"
          slug={post.slug}
          headings={headings}
        />

        <header
          className="portfolio-article-hero content-reading-width"
          aria-labelledby="post-title"
        >
          <h1
            id="post-title"
            tabIndex={-1}
            aria-label={titleParts ? post.title : undefined}
          >
            {titleParts ? (
              <>
                <span>{titleParts[1]}</span>
                <span>{titleParts[2]}</span>
              </>
            ) : (
              post.title
            )}
          </h1>
          <p className="portfolio-lede">{post.summary}</p>
          <div className="portfolio-article-meta" aria-label="文章信息">
            <time dateTime={post.date}>{formatDetailDate(post.date)}</time>
            <span>{post.readingTime} 分钟</span>
            {post.updated !== post.date && (
              <span>更新于 {formatDetailDate(post.updated)}</span>
            )}
            <div className="portfolio-tags" aria-label="文章标签">
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </header>

        <div className="content-reading-body content-reading-width">
          <CodeBlockEnhancer>
            <div
              className="portfolio-prose prose"
              id="article-body"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </CodeBlockEnhancer>
          <ReadingBackToTop titleId="post-title" />
        </div>

        {relatedPosts.length > 0 && (
          <section
            className="content-related content-reading-width"
            aria-labelledby="related-title"
          >
            <h2 id="related-title">{relatedTitle}</h2>
            <div className="portfolio-article-list">
              {relatedPosts.map((relatedPost) => (
                <PostCard
                  key={relatedPost.slug}
                  post={relatedPost}
                  titleElement="h3"
                />
              ))}
            </div>
          </section>
        )}

        <section
          className="portfolio-contact-band"
          aria-labelledby="writing-contact-title"
        >
          <div>
            <h2 id="writing-contact-title">了解我的其他项目</h2>
            <p>可以在 GitHub 查看我的公开仓库。</p>
          </div>
          <a
            className="portfolio-button"
            href={SITE.githubProfile.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看 GitHub 主页
          </a>
        </section>
      </div>
    </article>
  );
}
