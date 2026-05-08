import Link from "next/link";
import { notFound } from "next/navigation";

import { CodeBlockEnhancer } from "@/components/post/code-block";
import { getAllProjectSlugs, getProjectBySlug } from "@/lib/projects";
import { siteUrl } from "@/lib/site";

import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug, "zh-CN");
  if (!project) return {};

  return {
    title: project.title,
    description: project.description,
    alternates: {
      canonical: siteUrl(`/projects/${slug}/`),
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug, "zh-CN");
  if (!project) notFound();

  return (
    <article
      className="page is-active"
      data-route-page="projects"
      aria-labelledby="project-title"
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workbench / case plate</p>
            <h1 id="project-title">{project.title}</h1>
            {project.description && (
              <p className="lede">{project.description}</p>
            )}
          </div>
          <p>
            {project.date} / {project.tags.join(" / ")}
          </p>
        </div>

        <div className="project-detail-layout">
          <div
            className="project-visual project-visual-large"
            aria-hidden="true"
          />
          <div className="project-links">
            <Link className="project-link" href="/projects/">
              返回项目板
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
          <CodeBlockEnhancer>
            <div
              className="bio-card large prose"
              dangerouslySetInnerHTML={{ __html: project.content }}
            />
          </CodeBlockEnhancer>
        </div>
      </div>
    </article>
  );
}
