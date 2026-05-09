import { PostArchive } from "@/components/post/post-archive";
import { getAllPostsMeta, getAllTags } from "@/lib/posts";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "档案室",
  description: "旧档案馆和报纸式阅读体验的中文文章列表。",
};

export default function PostsPage() {
  const posts = getAllPostsMeta("zh-CN");
  const tags = getAllTags("zh-CN");

  return (
    <section
      className="page is-active"
      data-route-page="articles"
      aria-labelledby="articles-title"
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Archive / newspaper room</p>
            <h1 id="articles-title" data-od-id="article-headline">
              档案室
            </h1>
            <p className="lede">
              主要浏览区域采用旧档案馆和报纸式阅读体验：左侧是筛选柜，右侧是文章列表和最新阅读
            </p>
          </div>
          <p></p>
        </div>
        <PostArchive posts={posts} tags={tags} />
      </div>
    </section>
  );
}
