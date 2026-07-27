import { ProjectCard } from "./project-card";

import type { ProjectMeta } from "@/lib/projects";

interface ProjectListProps {
  projects: ProjectMeta[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) return <p className="empty-state">暂无项目</p>;

  return (
    <div className="portfolio-project-grid" data-od-id="project-grid">
      {projects.map((project) => (
        <ProjectCard key={project.slug} project={project} />
      ))}
    </div>
  );
}
