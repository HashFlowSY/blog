import Link from "next/link";

import { SITE } from "@/lib/site";

import { CodeBlockEnhancer } from "./code-block";
import { ReadingProgress } from "./reading-progress";

import type { TocItem } from "@/lib/markdown";
import type { Post, PostMeta } from "@/lib/posts";

interface PostDetailTemplateProps {
  contentHtml: string;
  headings: TocItem[];
  post: Post;
  relatedPosts: PostMeta[];
  relatedTitle?: string;
}

export interface RelatedReadingSelection {
  posts: PostMeta[];
  title: "关联阅读" | "最新文章";
}

export function formatDetailDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return date.replaceAll("-", ".");
}

export function selectRelatedPosts(
  currentSlug: string,
  posts: PostMeta[],
  limit = 3,
): PostMeta[] {
  return selectRelatedReading(currentSlug, posts, limit).posts;
}

export function selectRelatedReading(
  currentSlug: string,
  posts: PostMeta[],
  limit = 3,
): RelatedReadingSelection {
  const currentPost = posts.find((item) => item.slug === currentSlug);
  const candidates = posts.filter((item) => item.slug !== currentSlug);

  if (!currentPost || currentPost.tags.length === 0) {
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

export function stripLeadingTitleHeading(html: string, title: string): string {
  const match = html.match(/^<h1\b[^>]*>(.*?)<\/h1>\s*/i);
  if (!match) return html;

  const headingText = match[1]!.replace(/<[^>]*>/g, "").trim();
  if (headingText !== title.trim()) return html;

  return html.slice(match[0].length);
}

function formatMetaLine(post: PostMeta): string {
  return `${formatDetailDate(post.date)} / ${post.tags[0] ?? "Archive"}`;
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
  contentHtml,
  headings,
  post,
  relatedPosts,
  relatedTitle = "关联阅读",
}: PostDetailTemplateProps) {
  const tags = post.tags.length > 0 ? post.tags : ["未分类"];
  const displayContent = stripLeadingTitleHeading(contentHtml, post.title);
  const showToc = headings.length >= 2;

  return (
    <article
      className="page article-shell portfolio-page portfolio-article-page is-active"
      data-route-page="articles"
      aria-labelledby="post-title"
    >
      <ReadingProgress />
      <div className="portfolio-shell">
        <Link className="portfolio-back-link" href="/posts/">
          返回技术写作
        </Link>

        <header
          className="portfolio-article-hero detail-hero"
          aria-labelledby="post-title"
        >
          <p className="portfolio-overline">Writing / engineering note</p>
          <h1 id="post-title" data-od-id="detail-headline">
            {post.title}
          </h1>
          {post.summary && <p className="portfolio-lede">{post.summary}</p>}
          <div className="portfolio-article-meta" aria-label="文章信息">
            <span>{formatDetailDate(post.date)}</span>
            <span>{post.readingTime} min</span>
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

        <div
          className={[
            "portfolio-reader-layout",
            showToc ? "has-toc" : "without-toc",
          ].join(" ")}
        >
          {showToc && (
            <aside className="portfolio-reader-index" aria-label="文章目录">
              <p className="portfolio-overline">Contents</p>
              <nav className="portfolio-toc-list" aria-label="文章章节">
                {headings.map((heading, index) => (
                  <a
                    className="portfolio-toc-link"
                    href={`#${heading.id}`}
                    key={heading.id}
                  >
                    {String(index + 1).padStart(2, "0")} {heading.text}
                  </a>
                ))}
              </nav>
            </aside>
          )}

          <article className="portfolio-reader-card reader-card">
            <CodeBlockEnhancer>
              <div
                className="article-body portfolio-prose prose"
                id="article-body"
                data-od-id="detail-body"
                dangerouslySetInnerHTML={{ __html: displayContent }}
              />
            </CodeBlockEnhancer>
          </article>
        </div>

        {relatedPosts.length > 0 && (
          <section
            className="portfolio-related-section related-section"
            aria-labelledby="related-title"
          >
            <div className="portfolio-section-heading">
              <div>
                <p className="portfolio-overline">Continue reading</p>
                <h2 id="related-title">{relatedTitle}</h2>
              </div>
            </div>
            <div
              className="portfolio-related-list"
              data-od-id="detail-related-grid"
            >
              {relatedPosts.map((relatedPost, index) => (
                <Link
                  className="portfolio-related-row"
                  href={`/posts/${relatedPost.slug}/`}
                  key={relatedPost.slug}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <small>{formatMetaLine(relatedPost)}</small>
                    <strong>{relatedPost.title}</strong>
                    {relatedPost.summary && <span>{relatedPost.summary}</span>}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section
          className="portfolio-contact-band"
          aria-labelledby="writing-contact-title"
        >
          <div>
            <p className="portfolio-overline">Contact / discuss</p>
            <h2 id="writing-contact-title">想继续讨论这个问题？</h2>
            <p>欢迎通过 GitHub 继续讨论。</p>
          </div>
          <a
            className="portfolio-button"
            href={SITE.githubProfile.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {SITE.githubProfile.label}
          </a>
        </section>
      </div>
    </article>
  );
}
