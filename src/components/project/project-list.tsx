import { CollectionReturnFocus } from "@/components/layout/collection-return-focus";

import { ProjectCard } from "./project-card";

import type { ProjectCaseMeta } from "@/lib/content-catalog";

interface ProjectListProps {
  projects: ProjectCaseMeta[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) return <p className="empty-state">暂无项目</p>;

  return (
    <div className="portfolio-project-grid">
      {projects.map((project) => (
        <ProjectCard key={project.slug} project={project} />
      ))}
      <CollectionReturnFocus collection="projects" />
    </div>
  );
}
