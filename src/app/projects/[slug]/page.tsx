import Link from "next/link";
import { notFound } from "next/navigation";

import { BackToTop } from "@/components/layout/back-to-top";
import { DocumentBody } from "@/components/markdown/document-body";
import { ReadingTools } from "@/components/markdown/reading-tools";
import styles from "@/components/project/project-detail.module.css";
import { ProjectStory } from "@/components/project/project-story";
import { getContentCatalog } from "@/lib/content-catalog";
import { collectionCardId } from "@/lib/content-navigation";
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
      className="portfolio-page content-page content-detail-page"
      aria-labelledby="project-title"
    >
      <div className={styles["shell"]}>
        <header className={styles["intro"]}>
          <div>
            <p className={styles["eyebrow"]}>
              {showcase?.eyebrow ?? "项目档案"}
            </p>
            <h1 id="project-title" tabIndex={-1}>
              {projectCase.title}
            </h1>
            <p>{showcase?.intro ?? projectCase.description}</p>
          </div>
          {(demo || source) && (
            <nav className={styles["actions"]} aria-label="项目入口">
              {demo && (
                <a
                  className="portfolio-button portfolio-button-primary"
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
                  className={styles["source"]}
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看源码 <span aria-hidden="true">↗</span>
                </a>
              )}
            </nav>
          )}
        </header>

        <dl className={styles["facts"]}>
          <div>
            <dt>本人工作</dt>
            <dd>{projectCase.role}</dd>
          </div>
          <div>
            <dt className="sr-only">项目周期</dt>
            <dd>{projectCase.duration}</dd>
          </div>
        </dl>

        <ReadingTools
          bodyId={projectBodyId}
          collection="projects"
          slug={slug}
          outline={outline}
        />
        {showcase?.chapters ? (
          <ProjectStory id={projectBodyId} tree={document.tree} />
        ) : (
          <div className={styles["plainStory"]}>
            <DocumentBody id={projectBodyId} tree={document.tree} />
          </div>
        )}

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
          <Link
            className={styles["footerReturn"]}
            href={`/projects/#${collectionCardId("projects", slug)}`}
            replace
          >
            <span aria-hidden="true">←</span> 返回项目
          </Link>
          <BackToTop targetId="project-title" placement="detail" />
        </footer>
      </div>
    </article>
  );
}
