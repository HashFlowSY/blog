import Link from "next/link";

import { CodeBlockEnhancer } from "./code-block";
import { ReadingProgress } from "./reading-progress";

import type { TocItem } from "@/lib/markdown";
import type { Post, PostMeta } from "@/lib/posts";

interface PostDetailTemplateProps {
  contentHtml: string;
  headings: TocItem[];
  post: Post;
  relatedPosts: PostMeta[];
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
  return posts.filter((item) => item.slug !== currentSlug).slice(0, limit);
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

export function PostDetailTemplate({
  contentHtml,
  headings,
  post,
  relatedPosts,
}: PostDetailTemplateProps) {
  const tags = post.tags.length > 0 ? post.tags : ["未分类"];
  const displayContent = stripLeadingTitleHeading(contentHtml, post.title);

  return (
    <article
      className="page article-shell is-active"
      data-route-page="articles"
      aria-labelledby="post-title"
    >
      <ReadingProgress />
      <div className="container">
        <Link className="back-link" href="/posts/">
          返回文章档案室
        </Link>

        <section className="detail-hero" aria-labelledby="post-title">
          <div>
            <p className="eyebrow">Interface / Reading record</p>
            <h1 id="post-title" data-od-id="detail-headline">
              {post.title}
            </h1>
            {post.summary && <p className="deck">{post.summary}</p>}
          </div>

          <aside className="detail-panel" aria-label="文章档案信息">
            <div className="detail-grid">
              <div className="detail-chip">
                <span>Date</span>
                <strong>{formatDetailDate(post.date)}</strong>
              </div>
              <div className="detail-chip">
                <span>Read</span>
                <strong>{post.readingTime} min</strong>
              </div>
              {post.updated !== post.date && (
                <div className="detail-chip">
                  <span>Update</span>
                  <strong>{formatDetailDate(post.updated)}</strong>
                </div>
              )}
              <div className="detail-chip detail-chip--tags">
                <span>Tags</span>
                <div className="tag-list" aria-label="文章标签">
                  {tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <div className="article-layout">
          <aside className="reader-index" aria-label="文章目录">
            <section className="side-card">
              <p className="side-card-title">Contents / quiet map</p>
              {headings.length > 0 ? (
                <nav className="toc-list" aria-label="文章章节">
                  {headings.map((heading, index) => (
                    <a
                      className="toc-link"
                      href={`#${heading.id}`}
                      key={heading.id}
                    >
                      {String(index + 1).padStart(2, "0")} {heading.text}
                    </a>
                  ))}
                </nav>
              ) : (
                <p className="side-card-empty">暂无目录</p>
              )}
            </section>
          </aside>

          <article className="reader-card">
            <CodeBlockEnhancer>
              <div
                className="article-body prose"
                id="article-body"
                data-od-id="detail-body"
                dangerouslySetInnerHTML={{ __html: displayContent }}
              />
            </CodeBlockEnhancer>
          </article>
        </div>

        <section className="related-section" aria-labelledby="related-title">
          <div className="related-header">
            <h2 id="related-title">关联阅读</h2>
            <p></p>
          </div>
          {relatedPosts.length > 0 ? (
            <div className="related-grid" data-od-id="detail-related-grid">
              {relatedPosts.map((relatedPost) => (
                <Link
                  className="related-card"
                  href={`/posts/${relatedPost.slug}/`}
                  key={relatedPost.slug}
                >
                  <span className="related-thumb" aria-hidden="true" />
                  <span className="meta">{formatMetaLine(relatedPost)}</span>
                  <h3>{relatedPost.title}</h3>
                  {relatedPost.summary && <p>{relatedPost.summary}</p>}
                </Link>
              ))}
            </div>
          ) : (
            <p className="empty-state">暂无关联阅读</p>
          )}
        </section>
      </div>
    </article>
  );
}
