import { notFound } from "next/navigation";

import { ArticleDetail } from "@/components/post/article-detail";
import { getContentCatalog } from "@/lib/content-catalog";
import { siteUrl } from "@/lib/site";

import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const catalog = await getContentCatalog();
  return catalog.postSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getContentCatalog();
  const post = catalog.getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.summary,
    alternates: {
      canonical: siteUrl(`/posts/${slug}/`),
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;
  const catalog = await getContentCatalog();
  const post = catalog.getPostBySlug(slug);
  if (!post) notFound();

  return <ArticleDetail post={post} posts={catalog.posts} />;
}
