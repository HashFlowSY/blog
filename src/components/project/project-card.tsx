import Link from "next/link";

import type { ProjectMeta } from "@/lib/projects";

interface ProjectCardProps {
  project: ProjectMeta;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const status = project.featured ? "active" : "prototype";
  const category = project.tags[0] ?? "Project";

  return (
    <article className="project-card" data-filter-item={category}>
      <div className="project-visual" aria-hidden="true" />
      <p className="meta">
        {category} / {status}
      </p>
      <h3>
        <Link href={`/projects/${project.slug}/`}>{project.title}</Link>
      </h3>
      {project.description && <p>{project.description}</p>}
      {project.tags.length > 0 && (
        <div className="tags">
          {project.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="project-links">
        <Link className="project-link" href={`/projects/${project.slug}/`}>
          案例页
        </Link>
        {project.source && (
          <a
            className="project-link"
            href={project.source}
            target="_blank"
            rel="noopener noreferrer"
          >
            源代码
          </a>
        )}
        {project.demo && (
          <a
            className="project-link"
            href={project.demo}
            target="_blank"
            rel="noopener noreferrer"
          >
            在线演示
          </a>
        )}
      </div>
    </article>
  );
}
