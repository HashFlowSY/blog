import { notFound } from "next/navigation";

import { BackToTop } from "@/components/layout/back-to-top";
import { DocumentBody } from "@/components/markdown/document-body";
import { ReadingTools } from "@/components/markdown/reading-tools";
import styles from "@/components/project/project-detail.module.css";
import { ProjectGallery } from "@/components/project/project-gallery";
import { ProjectReturnLink } from "@/components/project/project-return-link";
import { ProjectStory } from "@/components/project/project-story";
import { getContentCatalog } from "@/lib/content-catalog";
import { siteUrl } from "@/lib/site";

import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

const projectBodyId = "project-body";

export async function generateStaticParams() {
  const catalog = await getContentCatalog();
  return catalog.projectCaseSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getContentCatalog();
  const projectCase = catalog.getProjectCaseBySlug(slug);
  if (!projectCase) return {};

  return {
    title: projectCase.title,
    description: projectCase.description,
    alternates: {
      canonical: siteUrl(`/projects/${slug}/`),
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const catalog = await getContentCatalog();
  const projectCase = catalog.getProjectCaseBySlug(slug);
  if (!projectCase) notFound();

  const { document, showcase, evidence, demo, source } = projectCase;
  const outline = showcase?.chapters
    ? document.outline.filter(({ level }) => level === 2)
    : document.outline;

  return (
    <article
      className="content-page content-detail-page"
      aria-labelledby="project-title"
    >
      <ReadingTools
        bodyId={projectBodyId}
        collection="projects"
        slug={slug}
        outline={outline}
      />
      <header className={styles["intro"]}>
        <div>
          <p className="collection-eyebrow">
            {showcase?.eyebrow ?? "项目档案"}
          </p>
          <h1 id="project-title" tabIndex={-1}>
            {projectCase.title}
          </h1>
          <p className={styles["lead"]}>
            {showcase?.intro ?? projectCase.description}
          </p>
          <dl className={styles["facts"]}>
            <div>
              <dt>我的角色</dt>
              <dd>{projectCase.role}</dd>
            </div>
            <div>
              <dt className="sr-only">项目周期</dt>
              <dd>{projectCase.duration}</dd>
            </div>
          </dl>
          {(demo || source) && (
            <nav className={styles["actions"]} aria-label="项目入口">
              {demo && (
                <a
                  className="content-text-link"
                  href={demo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {showcase?.demoLabel ?? "打开在线演示"}{" "}
                  <span aria-hidden="true">↗</span>
                </a>
              )}
              {source && (
                <a
                  className="content-text-link"
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看源码 <span aria-hidden="true">↗</span>
                </a>
              )}
            </nav>
          )}
        </div>
        <ProjectGallery
          key={slug}
          slug={slug}
          title={projectCase.title}
          cover={projectCase.cover}
          screenshots={showcase?.screenshots}
        />
      </header>
      <div className={styles["bodyLayout"]}>
        {outline.length >= 2 && (
          <nav
            className={styles["index"]}
            id={`${projectBodyId}-index`}
            aria-label="项目目录"
          >
            <h2>项目目录</h2>
            {outline.map((heading) => (
              <a key={heading.id} href={`#${heading.id}`}>
                {heading.text}
              </a>
            ))}
          </nav>
        )}
        <div className={styles["manuscript"]}>
          {showcase?.chapters ? (
            <ProjectStory id={projectBodyId} tree={document.tree} />
          ) : (
            <DocumentBody id={projectBodyId} tree={document.tree} />
          )}
        </div>
      </div>

      <footer className={styles["footer"]}>
        <div>
          <p className={styles["result"]}>{projectCase.result}</p>
          {evidence && (
            <a href={evidence.url} target="_blank" rel="noopener noreferrer">
              {evidence.label} <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
        <div className={styles["tags"]} aria-label="技术标签">
          {projectCase.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <ProjectReturnLink slug={slug} className="content-text-link" compact />
        <BackToTop targetId="project-title" placement="detail" />
      </footer>
    </article>
  );
}
