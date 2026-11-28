import { ProjectCard } from "./project-card";

import type { ProjectCase } from "@/lib/content-catalog";

interface ProjectListProps {
  projects: readonly ProjectCase[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0)
    return <p className="portfolio-empty-state">暂无项目</p>;

  return (
    <div className="portfolio-project-grid">
      {projects.map((project) => (
        <ProjectCard
          key={project.slug}
          project={project}
          chapters={
            project.showcase?.chapters ? project.document.tree : undefined
          }
        />
      ))}
    </div>
  );
}
