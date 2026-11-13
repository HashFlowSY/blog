import { BackToTop } from "@/components/layout/back-to-top";
import { DocumentBody } from "@/components/markdown/document-body";
import { ReadingTools } from "@/components/markdown/reading-tools";
import { postCardMeta } from "@/lib/content-catalog";
import { relatedReading } from "@/lib/related-reading";
import { SITE } from "@/lib/site";

import { ArticleReadingMeta } from "./article-reading-meta";
import { PostCard } from "./post-card";

import type { Post } from "@/lib/content-catalog";

const titleId = "post-title";
const bodyId = "article-body";

export function ArticleDetail({
  post,
  posts,
}: {
  post: Post;
  posts: readonly Post[];
}) {
  const { document, title, summary, slug, tags, date, updated } = post;
  const related = relatedReading(post, posts);
  const split = title.match(/^(.+?(?:：|:\s)\s*)(\S.*)$/u);

  return (
    <article
      className="portfolio-page content-page content-detail-page"
      aria-labelledby={titleId}
    >
      <div className="portfolio-shell">
        <ReadingTools
          bodyId={bodyId}
          collection="posts"
          slug={slug}
          outline={document.outline}
        />
        <header
          className="portfolio-article-hero content-reading-width"
          aria-labelledby={titleId}
        >
          <h1 id={titleId} tabIndex={-1} aria-label={split ? title : undefined}>
            {split ? (
              <>
                <span>{split[1]}</span>
                <span>{split[2]}</span>
              </>
            ) : (
              title
            )}
          </h1>
          <p className="portfolio-lede">{summary}</p>
          <div className="portfolio-article-meta" aria-label="文章信息">
            <time dateTime={date}>{date.replaceAll("-", ".")}</time>
            <ArticleReadingMeta stats={document.readingStats} />
            {updated !== date && (
              <span>
                更新于{" "}
                <time dateTime={updated}>{updated.replaceAll("-", ".")}</time>
              </span>
            )}
            <div className="portfolio-tags" aria-label="文章标签">
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </header>
        <div className="content-reading-body content-reading-width">
          <DocumentBody id={bodyId} tree={document.tree} />
          <BackToTop targetId={titleId} placement="detail" />
        </div>
        {related.posts.length > 0 && (
          <section
            className="content-related content-reading-width"
            aria-labelledby="related-title"
          >
            <h2 id="related-title">{related.title}</h2>
            <div className="portfolio-article-list">
              {related.posts.map((candidate) => (
                <PostCard
                  key={candidate.slug}
                  post={postCardMeta(candidate)}
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
