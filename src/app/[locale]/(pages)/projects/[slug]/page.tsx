import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getProjectBySlug, getAllProjectsMeta } from "@/lib/projects";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  return getAllProjectsMeta().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};

  return {
    title: project.title,
    description: project.description,
    openGraph: {
      title: project.title,
      description: project.description,
      type: "website",
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const t = await getTranslations({ locale, namespace: "projectPage" });

  return (
    <article className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <Link
          href="/projects/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; {t("allProjects")}
        </Link>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{project.title}</h1>
        {project.description && (
          <p className="mt-4 text-lg text-muted-foreground">
            {project.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-3 py-1 text-sm">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          {project.source && (
            <a
              href={project.source}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("source")}
            </a>
          )}
          {project.demo && (
            <a
              href={project.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-80"
            >
              {t("demo")}
            </a>
          )}
        </div>
      </header>

      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: project.content }}
      />
    </article>
  );
}
