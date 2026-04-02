import type { ProjectMeta } from "@/lib/projects";
import { ProjectCard } from "./project-card";

interface ProjectListProps {
  projects: ProjectMeta[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard key={project.slug} project={project} />
      ))}
    </div>
  );
}
