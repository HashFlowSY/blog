import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { ProjectList } from "@/components/project/project-list";
import { localeParams } from "@/i18n/routing";
import { getAllProjectsMeta } from "@/lib/projects";
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
  const t = await getTranslations({ locale, namespace: "projectPage" });
  return {
    title: t("title"),
    description: t("allProjects"),
    openGraph: {
      title: t("title"),
      description: t("allProjects"),
      type: "website",
      url: siteUrl(`/${locale}/projects/`),
      locale: locale.replace("-", "_"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("allProjects"),
    },
  };
}

export default async function ProjectsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "projectPage" });
  const projects = getAllProjectsMeta(locale);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">{t("allProjects")}</h1>

      {projects.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-8">
          <ProjectList projects={projects} />
        </div>
      )}
    </div>
  );
}
