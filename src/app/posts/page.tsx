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
      className="portfolio-page content-page"
      aria-labelledby="articles-title"
    >
      <div className="portfolio-shell">
        <header className="content-list-intro">
          <h1 id="articles-title">技术写作</h1>
          <p>记录 AI 工具、工程实现和技术取舍。</p>
        </header>

        <section className="content-list-section" aria-label="文章列表">
          <PostArchive posts={posts} tags={tags} />
        </section>
      </div>
    </section>
  );
}
