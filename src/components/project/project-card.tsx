import Image from "next/image";
import Link from "next/link";

import { assetPath } from "@/lib/site";

import type { ProjectMeta } from "@/lib/projects";

interface ProjectCardProps {
  project: ProjectMeta;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const cover = assetPath(project.cover ?? "/assets/workbench-hero.png");
  const kind = project.template ? "示例案例" : "真实项目";
  const role = project.role ?? "独立设计与开发";
  const result = project.result ?? "项目结果待补充";

  return (
    <article
      className={[
        "portfolio-project-card",
        project.featured ? "is-featured" : "",
        project.template ? "is-template" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-filter-item={project.tags[0] ?? "Project"}
    >
      <Link
        className="portfolio-project-media"
        href={`/projects/${project.slug}/`}
        aria-label={`查看${project.title}案例`}
      >
        <Image
          src={cover}
          alt={`${project.title}界面预览`}
          fill
          preload={project.featured}
          sizes={
            project.featured
              ? "(max-width: 760px) 100vw, 58vw"
              : "(max-width: 760px) 100vw, 46vw"
          }
        />
        <span className="portfolio-project-kind">{kind}</span>
      </Link>

      <div className="portfolio-project-copy">
        <p className="portfolio-overline">
          {project.date.replaceAll("-", ".")} /{" "}
          {project.tags.slice(0, 3).join(" · ")}
        </p>
        <h2>
          <Link href={`/projects/${project.slug}/`}>{project.title}</Link>
        </h2>
        {project.description && (
          <p className="portfolio-project-description">{project.description}</p>
        )}
        <dl className="portfolio-project-facts">
          <div>
            <dt>我的角色</dt>
            <dd>{role}</dd>
          </div>
          <div>
            <dt>{project.template ? "模板结果" : "项目结果"}</dt>
            <dd>{result}</dd>
          </div>
        </dl>
        {project.tags.length > 0 && (
          <div className="portfolio-tags" aria-label="项目标签">
            {project.tags.slice(0, 5).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
        <div className="portfolio-link-row">
          <Link
            className="portfolio-button portfolio-button-primary"
            href={`/projects/${project.slug}/`}
          >
            查看案例
          </Link>
          {project.source && (
            <a
              className="portfolio-text-link"
              href={project.source}
              target="_blank"
              rel="noopener noreferrer"
            >
              源代码
            </a>
          )}
          {project.demo && (
            <a
              className="portfolio-text-link"
              href={project.demo}
              target="_blank"
              rel="noopener noreferrer"
            >
              在线演示
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
