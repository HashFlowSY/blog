"use client";

import { useTranslations } from "next-intl";

import { TagBadge } from "@/components/tag";
import { Link } from "@/i18n/navigation";

import type { ProjectMeta } from "@/lib/projects";

interface ProjectCardProps {
  project: ProjectMeta;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const t = useTranslations("projectPage");

  return (
    <article className="group">
      <Link href={`/projects/${project.slug}/`} className="block">
        <div className="rounded-lg border border-border p-4 transition-all duration-200 hover:bg-accent hover:-translate-y-0.5 hover:shadow-sm">
          <h2 className="text-lg font-semibold group-hover:opacity-80 transition-opacity">
            {project.title}
          </h2>
          {project.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
          {project.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {project.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
            {project.source && (
              <span className="hover:text-foreground transition-colors">
                {t("source")}
              </span>
            )}
            {project.demo && (
              <span className="hover:text-foreground transition-colors">
                {t("demo")}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
