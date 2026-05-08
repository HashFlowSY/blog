import { buildRssXml } from "@/lib/feed";
import { getAllPostsMeta } from "@/lib/posts";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

const FEED_CONFIG = {
  title: "废料通信站",
  link: siteUrl("/"),
  description: "个人网站，写文章，写项目",
  language: "zh-CN",
} as const;

export async function GET() {
  const posts = getAllPostsMeta("zh-CN");

  const items = posts.map((post) => ({
    title: post.title,
    link: siteUrl(`/posts/${post.slug}/`),
    description: post.summary ?? "",
    pubDate: post.updated,
    categories: post.tags,
  }));

  const xml = buildRssXml({ ...FEED_CONFIG, items });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
