import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { siteUrl } from "@/lib/site";

import type { Metadata } from "next";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aboutPage" });
  return {
    title: t("title"),
    description: t("subtitle"),
    openGraph: {
      title: t("title"),
      description: t("subtitle"),
      type: "profile",
      url: siteUrl(`/${locale}/about/`),
      locale: locale.replace("-", "_"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("subtitle"),
    },
  };
}

const SKILLS = [
  { name: "TypeScript", level: 90 },
  { name: "React / Next.js", level: 90 },
  { name: "Node.js / Hono", level: 85 },
  { name: "Java", level: 90 },
  { name: "Springboot", level: 75 },
  { name: "PostgreSQL", level: 80 },
  { name: "Mysql", level: 80 },
  { name: "Redis", level: 70 },
  { name: "Tailwind CSS", level: 90 },
  { name: "Shadcn/ui", level: 80 },
  { name: "ClaudeCode", level: 80 },
  { name: "Docker / CI/CD", level: 75 },
] as const;

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "aboutPage" });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-12 space-y-12">
        {/* Skills */}
        <section>
          <h2 className="text-xl font-semibold mb-4">{t("skills")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SKILLS.map((skill) => (
              <div key={skill.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{skill.name}</span>
                  <span className="text-muted-foreground">{skill.level}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${skill.level}%` }}
                    role="progressbar"
                    aria-valuenow={skill.level}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${skill.name}: ${skill.level}%`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Experience */}
        <section>
          <h2 className="text-xl font-semibold mb-4">{t("experience")}</h2>
          <div className="relative space-y-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
            {[
              {
                year: `2025 - ${t("present")}`,
                title: t("exp1.title"),
                company: t("exp1.company"),
                desc: t("exp1.desc"),
              },
              {
                year: "2022 - 2025",
                title: t("exp2.title"),
                company: t("exp2.company"),
                desc: t("exp2.desc"),
              },
            ].map((item) => (
              <div key={item.year} className="relative pl-8">
                <div className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">
                    {item.year}
                  </div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.company}
                  </p>
                  <p className="mt-1 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
