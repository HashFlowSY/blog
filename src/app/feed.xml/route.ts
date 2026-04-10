import { buildRssXml } from "@/lib/feed";
import { getAllPostsMeta } from "@/lib/posts";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

const FEED_CONFIG = {
  title: "HashFlow's Blog",
  link: siteUrl("/"),
  description: "Personal blog about web development and technology",
  language: "zh-CN",
} as const;

export async function GET() {
  const posts = getAllPostsMeta("zh-CN");

  const items = posts.map((post) => ({
    title: post.title,
    link: siteUrl(`/zh-CN/posts/${post.slug}/`),
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
