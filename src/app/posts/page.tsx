import { PostArchive } from "@/components/post/post-archive";
import styles from "@/components/post/post-archive.module.css";
import { getContentCatalog, postCardMeta } from "@/lib/content-catalog";
import { POST_SEARCH_INDEX_PATH } from "@/lib/post-search";
import { assetPath, siteUrl } from "@/lib/site";

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

  return (
    <section
      className={`portfolio-page content-page ${styles["archive"]}`}
      aria-labelledby="articles-title"
    >
      <div className="portfolio-shell">
        <header className="content-list-intro">
          <h1 id="articles-title">技术写作</h1>
          <p>记录 AI 工具、工程实现和技术取舍。</p>
        </header>

        <section className="content-list-section" aria-label="文章列表">
          <PostArchive
            posts={catalog.posts.map(postCardMeta)}
            tags={catalog.tags}
            indexUrl={assetPath(POST_SEARCH_INDEX_PATH)}
          />
        </section>
      </div>
    </section>
  );
}
