import Image from "next/image";
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
            <p className="portfolio-overline">
              {project.template ? "Template case / 示例案例" : "Case study"}
            </p>
            <h1 id="project-title">{project.title}</h1>
            {project.description && (
              <p className="portfolio-lede">{project.description}</p>
            )}
            {project.template && (
              <p className="portfolio-template-notice">
                这是用于完善作品集结构的示例案例，不代表真实客户或真实商业结果。
              </p>
            )}
            <div className="portfolio-link-row">
              {project.source && (
                <a
                  className="portfolio-button portfolio-button-primary"
                  href={project.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看源代码
                </a>
              )}
              {project.demo && (
                <a
                  className="portfolio-button"
                  href={project.demo}
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
              <dd>{project.role ?? "独立设计与开发"}</dd>
            </div>
            <div>
              <dt>项目周期</dt>
              <dd>{project.duration ?? "持续迭代"}</dd>
            </div>
            <div>
              <dt>{project.template ? "模板结果" : "项目结果"}</dt>
              <dd>{project.result ?? "项目结果待补充"}</dd>
            </div>
            <div>
              <dt>技术标签</dt>
              <dd>{project.tags.join(" · ")}</dd>
            </div>
          </dl>
        </header>

        <figure className="portfolio-case-cover">
          <Image
            src={project.cover ?? "/assets/workbench-hero.png"}
            alt={`${project.title}项目界面预览`}
            fill
            preload
            sizes="(max-width: 760px) 100vw, 1200px"
          />
        </figure>

        <div className="portfolio-case-body">
          <aside className="portfolio-case-aside">
            <p className="portfolio-overline">Project note</p>
            <p>
              {project.template
                ? "把本页中的场景、角色、方案和验证方式替换成真实项目资料即可。"
                : "以下内容记录项目中的关键实现、取舍和验证方式。"}
            </p>
          </aside>
          <CodeBlockEnhancer>
            <div
              className="portfolio-prose prose"
              dangerouslySetInnerHTML={{ __html: project.content }}
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
          <a className="portfolio-button" href="mailto:hello@example.com">
            hello@example.com
          </a>
        </section>
      </div>
    </article>
  );
}
