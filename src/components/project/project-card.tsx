import Image from "next/image";
import Link from "next/link";

import { ProjectCover } from "@/components/project/project-cover";
import { collectionCardId } from "@/lib/content-navigation";
import { assetPath } from "@/lib/site";

import type { ProjectCaseMeta } from "@/lib/content-catalog";

interface ProjectCardProps {
  project: ProjectCaseMeta;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const cardId = collectionCardId("projects", project.slug);
  const titleId = `${cardId}-title`;

  return (
    <article>
      <Link
        id={cardId}
        data-project-entry={project.slug}
        className="content-card-link project-card-link"
        href={`/projects/${project.slug}/`}
        aria-labelledby={titleId}
      >
        <div className="project-card-copy">
          <div>
            <p className="content-card-meta">{project.duration}</p>
            <h2 id={titleId}>{project.title}</h2>
            <p className="project-card-result">{project.result}</p>
            <span className="content-text-link" aria-hidden="true">
              打开项目 →
            </span>
          </div>
          <div className="project-card-record">
            <p className="content-card-summary">{project.description}</p>
            <dl className="project-card-role">
              <dt>我的角色</dt>
              <dd>{project.role}</dd>
            </dl>
            <div className="portfolio-tags" aria-label="项目标签">
              {project.tags.slice(0, 5).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <ProjectCover slug={project.slug} className="portfolio-project-media">
          <Image
            src={assetPath(project.cover)}
            alt={`${project.title}界面预览`}
            fill
            preload={project.featured}
            sizes="(max-width: 650px) 100vw, 47vw"
          />
        </ProjectCover>
      </Link>
    </article>
  );
}
