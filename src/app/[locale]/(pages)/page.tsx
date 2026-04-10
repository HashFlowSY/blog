import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { PostList } from "@/components/post/post-list";
import { ProjectList } from "@/components/project/project-list";
import { Link } from "@/i18n/navigation";
import { localeParams } from "@/i18n/routing";
import { getAllPostsMeta } from "@/lib/posts";
import { getFeaturedProjects } from "@/lib/projects";
import { siteUrl } from "@/lib/site";

import type { Metadata } from "next";

interface Props {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [tHero] = await Promise.all([
    getTranslations({ locale, namespace: "hero" }),
  ]);
  return {
    title: tHero("title"),
    description: tHero("description"),
    openGraph: {
      title: tHero("title"),
      description: tHero("description"),
      type: "website",
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [tHero, tPostPage, tProjectPage] = await Promise.all([
    getTranslations({ locale, namespace: "hero" }),
    getTranslations({ locale, namespace: "postPage" }),
    getTranslations({ locale, namespace: "projectPage" }),
  ]);

  const recentPosts = getAllPostsMeta(locale).slice(0, 6);
  const featuredProjects = getFeaturedProjects(locale).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: tHero("siteName"),
    url: siteUrl("/"),
  };

  return (
    <div className="mx-auto max-w-4xl px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero Section */}
      <section aria-labelledby="hero-heading" className="py-16 sm:py-24">
        <h1 id="hero-heading" className="text-4xl font-bold sm:text-5xl">
          {tHero("greeting")}{" "}
          <span className="text-muted-foreground">HashFlow</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          {tHero("description")}
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/posts/"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-80"
          >
            {tHero("cta")}
          </Link>
          <Link
            href="/projects/"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            {tHero("viewProjects")}
          </Link>
        </div>
      </section>

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <section aria-labelledby="recent-posts-heading" className="pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 id="recent-posts-heading" className="text-2xl font-bold">
              {tPostPage("recentPosts")}
            </h2>
            <Link
              href="/posts/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {tPostPage("allPosts")} &rarr;
            </Link>
          </div>
          <PostList
            posts={recentPosts}
            updatedLabel={tPostPage("updatedAt")}
            minutesLabel={tPostPage("minutes")}
          />
        </section>
      )}

      {/* Featured Projects */}
      {featuredProjects.length > 0 && (
        <section aria-labelledby="featured-projects-heading" className="pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 id="featured-projects-heading" className="text-2xl font-bold">
              {tProjectPage("featured")}
            </h2>
            <Link
              href="/projects/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {tProjectPage("allProjects")} &rarr;
            </Link>
          </div>
          <ProjectList projects={featuredProjects} />
        </section>
      )}
    </div>
  );
}
