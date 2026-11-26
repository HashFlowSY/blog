import { PostArchive } from "@/components/post/post-archive";
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
    <section className="content-page" aria-labelledby="articles-title">
      <header className="content-list-intro">
        <div>
          <p className="collection-eyebrow" lang="en">
            Writing archive
          </p>
          <h1 id="articles-title">技术写作</h1>
          <p>记录 AI 工具、工程实现和技术取舍。</p>
        </div>
        <span className="collection-count" aria-hidden="true">
          {String(catalog.posts.length).padStart(2, "0")}
        </span>
      </header>

      <section className="content-list-section" aria-label="文章列表">
        <PostArchive
          posts={catalog.posts.map(postCardMeta)}
          tags={catalog.tags}
          indexUrl={assetPath(POST_SEARCH_INDEX_PATH)}
        />
      </section>
    </section>
  );
}
