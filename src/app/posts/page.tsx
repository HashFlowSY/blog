import { PostArchive } from "@/components/post/post-archive";
import { getContentCatalog } from "@/lib/content-catalog";
import { siteUrl } from "@/lib/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "技术写作",
  description: "记录 AI 工具、工程实现、技术取舍与复盘。",
  alternates: {
    canonical: siteUrl("/posts/"),
  },
};

export default async function PostsPage() {
  const catalog = await getContentCatalog();
  const posts = catalog.posts.slice();
  const tags = catalog.tags.slice();

  return (
    <section
      className="page portfolio-page portfolio-posts-page is-active"
      data-route-page="articles"
      aria-labelledby="articles-title"
    >
      <div className="portfolio-shell">
        <header className="portfolio-page-intro">
          <div>
            <p className="portfolio-overline">Writing / engineering notes</p>
            <h1 id="articles-title" data-od-id="article-headline">
              技术写作
            </h1>
            <p className="portfolio-lede">
              记录 AI 工具、工程实现和技术取舍，也保留验证过程与复盘。
            </p>
          </div>
          <dl className="portfolio-page-stats">
            <div>
              <dt>文章</dt>
              <dd>{posts.length.toString().padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>主题</dt>
              <dd>{tags.length.toString().padStart(2, "0")}</dd>
            </div>
          </dl>
        </header>

        <section className="portfolio-section" aria-label="文章列表">
          <PostArchive posts={posts} tags={tags} />
        </section>
      </div>
    </section>
  );
}
