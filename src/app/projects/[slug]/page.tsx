import { notFound } from "next/navigation";

import { ReadingBackToTop } from "@/components/layout/back-to-top";
import { DetailToolbar } from "@/components/layout/detail-toolbar";
import { CodeBlockEnhancer } from "@/components/post/code-block";
import { ProjectCover } from "@/components/project/project-cover";
import { getContentCatalog } from "@/lib/content-catalog";
import { assetPath, SITE, siteUrl } from "@/lib/site";

import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

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

  return (
    <article
      className="portfolio-page content-page content-detail-page"
      aria-labelledby="project-title"
    >
      <div className="portfolio-shell">
        <DetailToolbar
          bodyId="project-body"
          collection="projects"
          slug={projectCase.slug}
          headings={projectCase.renderedContent.headings}
        />

        <div className="case-overview">
          <header className="portfolio-case-hero">
            <h1 id="project-title" tabIndex={-1}>
              {projectCase.title}
            </h1>
            <p className="portfolio-lede">{projectCase.description}</p>
            <dl className="case-outcome">
              <dt>项目结果</dt>
              <dd>{projectCase.result}</dd>
              {projectCase.evidence && (
                <dd>
                  <a
                    className="case-outcome-evidence"
                    href={projectCase.evidence.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {projectCase.evidence.label}{" "}
                    <span aria-hidden="true">↗</span>
                  </a>
                </dd>
              )}
            </dl>
          </header>
          <ProjectCover
            src={assetPath(projectCase.cover)}
            title={projectCase.title}
          />
        </div>

        <div className="case-meta">
          <dl className="portfolio-case-facts">
            <div>
              <dt>我的角色</dt>
              <dd>{projectCase.role}</dd>
            </div>
            <div>
              <dt>项目周期</dt>
              <dd>{projectCase.duration}</dd>
            </div>
            <div>
              <dt>技术标签</dt>
              <dd className="portfolio-tags">
                {projectCase.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </dd>
            </div>
          </dl>
          {(projectCase.source || projectCase.demo) && (
            <div className="portfolio-link-row case-links">
              {projectCase.demo && (
                <a
                  className="portfolio-button portfolio-button-primary"
                  href={projectCase.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  打开在线演示 <span aria-hidden="true">↗</span>
                </a>
              )}
              {projectCase.source && (
                <a
                  className="portfolio-button"
                  href={projectCase.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看源代码 <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}
        </div>

        <div className="content-reading-body content-reading-width">
          <CodeBlockEnhancer>
            <div
              className="portfolio-prose prose"
              id="project-body"
              dangerouslySetInnerHTML={{
                __html: projectCase.renderedContent.html,
              }}
            />
          </CodeBlockEnhancer>
          <ReadingBackToTop titleId="project-title" />
        </div>

        <section
          className="portfolio-contact-band"
          aria-labelledby="case-contact-title"
        >
          <div>
            <h2 id="case-contact-title">了解我的其他项目</h2>
            <p>可以在 GitHub 查看我的公开仓库。</p>
          </div>
          <a
            className="portfolio-button"
            href={SITE.githubProfile.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看 GitHub 主页
          </a>
        </section>
      </div>
    </article>
  );
}
