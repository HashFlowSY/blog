import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CodeBlockEnhancer } from "@/components/post/code-block";
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
      className="page portfolio-page portfolio-project-detail is-active"
      data-route-page="projects"
      aria-labelledby="project-title"
    >
      <div className="portfolio-shell">
        <Link className="portfolio-back-link" href="/projects/">
          返回项目案例
        </Link>

        <header className="portfolio-case-hero">
          <div>
            <p className="portfolio-overline">项目案例</p>
            <h1 id="project-title">{projectCase.title}</h1>
            <p className="portfolio-lede">{projectCase.description}</p>
            <div className="portfolio-link-row">
              {projectCase.source && (
                <a
                  className="portfolio-button portfolio-button-primary"
                  href={projectCase.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看源代码
                </a>
              )}
              {projectCase.demo && (
                <a
                  className="portfolio-button"
                  href={projectCase.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  打开在线演示
                </a>
              )}
            </div>
          </div>
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
              <dt>项目结果</dt>
              <dd>{projectCase.result}</dd>
            </div>
            <div>
              <dt>技术标签</dt>
              <dd>{projectCase.tags.join(" · ")}</dd>
            </div>
          </dl>
        </header>

        <figure className="portfolio-case-cover">
          <Image
            src={assetPath(projectCase.cover)}
            alt={`${projectCase.title}项目界面预览`}
            fill
            preload
            sizes="(max-width: 760px) 100vw, 1200px"
          />
        </figure>

        <div className="portfolio-case-body">
          <aside className="portfolio-case-aside">
            <p className="portfolio-overline">Project note</p>
            <p>以下内容记录项目中的关键实现、取舍和验证方式。</p>
          </aside>
          <CodeBlockEnhancer>
            <div
              className="portfolio-prose prose"
              dangerouslySetInnerHTML={{ __html: projectCase.content }}
            />
          </CodeBlockEnhancer>
        </div>

        <section
          className="portfolio-contact-band"
          aria-labelledby="case-contact-title"
        >
          <div>
            <p className="portfolio-overline">Next / collaboration</p>
            <h2 id="case-contact-title">希望把类似需求推进到上线？</h2>
            <p>欢迎带着背景、约束或现有系统来聊。</p>
          </div>
          <a
            className="portfolio-button"
            href={SITE.githubProfile.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {SITE.githubProfile.label}
          </a>
        </section>
      </div>
    </article>
  );
}
