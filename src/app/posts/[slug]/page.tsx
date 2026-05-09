import { notFound } from "next/navigation";

import {
  PostDetailTemplate,
  selectRelatedReading,
} from "@/components/post/post-detail-template";
import { extractHeadings } from "@/lib/markdown";
import { getAllPostsMeta, getAllPostSlugs, getPostBySlug } from "@/lib/posts";
import { siteUrl } from "@/lib/site";

import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug, "zh-CN");
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
  const post = await getPostBySlug(slug, "zh-CN");
  if (!post) notFound();

  const headings = extractHeadings(post.content);
  const relatedReading = selectRelatedReading(
    slug,
    getAllPostsMeta("zh-CN"),
    3,
  );

  return (
    <PostDetailTemplate
      contentHtml={post.content}
      headings={headings}
      post={post}
      relatedPosts={relatedReading.posts}
      relatedTitle={relatedReading.title}
    />
  );
}
