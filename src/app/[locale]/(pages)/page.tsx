import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { PostList } from "@/components/post/post-list";
import { ProjectList } from "@/components/project/project-list";
import { Link } from "@/i18n/navigation";
import { getAllPostsMeta } from "@/lib/posts";
import { getFeaturedProjects } from "@/lib/projects";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [tHero, tPostPage, tProjectPage] = await Promise.all([
    getTranslations({ locale, namespace: "hero" }),
    getTranslations({ locale, namespace: "postPage" }),
    getTranslations({ locale, namespace: "projectPage" }),
  ]);

  const recentPosts = getAllPostsMeta().slice(0, 6);
  const featuredProjects = getFeaturedProjects().slice(0, 4);

  return (
    <div className="mx-auto max-w-4xl px-6">
      {/* Hero Section */}
      <section className="py-16 sm:py-24">
        <h1 className="text-4xl font-bold sm:text-5xl">
          {tHero("greeting")}{" "}
          <span className="text-muted-foreground">ShangYang</span>
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
        <section className="pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{tPostPage("recentPosts")}</h2>
            <Link
              href="/posts/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {tPostPage("allPosts")} &rarr;
            </Link>
          </div>
          <PostList posts={recentPosts} updatedLabel={tPostPage("updatedAt")} />
        </section>
      )}

      {/* Featured Projects */}
      {featuredProjects.length > 0 && (
        <section className="pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{tProjectPage("featured")}</h2>
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
