import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { PostToc } from "@/components/post/post-toc";
import { TagBadge } from "@/components/tag";
import { Link } from "@/i18n/navigation";
import { extractHeadings } from "@/lib/markdown";
import { getPostBySlug, getAllPostsMeta, getAdjacentPosts } from "@/lib/posts";

import type { Metadata } from "next";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  const posts = getAllPostsMeta();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated,
      tags: post.tags,
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: "postPage" });
  const { prev, next } = getAdjacentPosts(slug);
  const headings = extractHeadings(post.content);

  return (
    <article className="mx-auto max-w-4xl px-6 py-12">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <time dateTime={post.date}>
            {t("publishedAt")} {post.date}
          </time>
          {post.updated !== post.date && (
            <time dateTime={post.updated}>
              ({t("updatedAt")} {post.updated})
            </time>
          )}
          {post.tags.length > 0 && (
            <div className="flex gap-1">
              {post.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content + TOC */}
      <div className="grid gap-8 lg:grid-cols-[1fr_200px]">
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <PostToc headings={headings} />
          </div>
        </aside>
      </div>

      {/* Prev/Next Navigation */}
      <nav className="mt-12 flex items-center justify-between border-t border-border pt-8">
        {prev ? (
          <Link
            href={`/posts/${prev.slug}/`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; {prev.title}
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/posts/${next.slug}/`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {next.title} &rarr;
          </Link>
        ) : (
          <div />
        )}
      </nav>
    </article>
  );
}
