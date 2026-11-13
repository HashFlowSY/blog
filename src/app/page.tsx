import Image from "next/image";
import Link from "next/link";

import { AssemblyWorkbench } from "@/components/home/assembly-workbench";
import { getContentCatalog } from "@/lib/content-catalog";
import { assetPath, SITE, siteUrl } from "@/lib/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: siteUrl("/"),
  },
};

const capabilities = [
  {
    title: "AI 应用",
    description: "把模糊需求拆成可运行的 AI 功能、Agent 流程和工具链。",
  },
  {
    title: "后端系统",
    description: "从 API、数据库到性能优化，构建能长期维护的服务。",
  },
  {
    title: "自动化交付",
    description: "打通需求、开发、测试和部署，减少重复劳动。",
  },
] as const;

function formatDate(date: string): string {
  return date.replaceAll("-", ".");
}

export default async function HomePage() {
  const catalog = await getContentCatalog();
  const recentPosts = catalog.posts.slice(0, 3);
  const featuredProjectCase = catalog.featuredProjectCases[0] ?? null;

  return (
    <section className="workbench-home" aria-labelledby="home-title">
      <div className="workbench-hero">
        <div className="workbench-hero-copy">
          <h1 id="home-title">
            {SITE.name}
            <span>{SITE.role}</span>
          </h1>
          <p className="workbench-lede">
            从需求拆解到上线，交付 <span>AI 应用</span>
            、后端系统和自动化工具。
          </p>
          <p className="workbench-intro">
            4 年以上工程经历 · 开放全职机会与项目合作
          </p>
          <div className="workbench-actions">
            <a
              className="workbench-button workbench-button-primary"
              href="#selected-work"
            >
              查看代表项目 <span aria-hidden="true">↓</span>
            </a>
            <Link className="workbench-button" href="/about/#contact">
              联系我 <span aria-hidden="true">↗</span>
            </Link>
            <Link className="workbench-button" href="/posts/">
              读文章 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <AssemblyWorkbench />
      </div>

      <section
        className="workbench-section"
        id="selected-work"
        aria-labelledby="featured-work-title"
      >
        <div className="workbench-section-heading">
          <h2 id="featured-work-title">代表项目</h2>
          <Link className="workbench-text-link" href="/projects/">
            全部项目 <span aria-hidden="true">→</span>
          </Link>
        </div>

        {featuredProjectCase ? (
          <article className="featured-work">
            <div className="featured-work-copy">
              <h3>{featuredProjectCase.title}</h3>
              <p className="featured-work-result">
                {featuredProjectCase.result}
              </p>
              <dl className="featured-work-details">
                <div>
                  <dt>我的角色</dt>
                  <dd>{featuredProjectCase.role}</dd>
                </div>
              </dl>
              <div className="workbench-tags" aria-label="项目技术标签">
                {featuredProjectCase.tags.slice(0, 5).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <Link
                className="workbench-text-link"
                href={`/projects/${featuredProjectCase.slug}/`}
              >
                查看项目详情 <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="featured-work-media">
              <Image
                src={assetPath(featuredProjectCase.cover)}
                alt={`${featuredProjectCase.title}项目界面预览`}
                fill
                sizes="(max-width: 900px) 100vw, 55vw"
              />
            </div>
          </article>
        ) : (
          <p className="workbench-empty">项目案例正在整理中。</p>
        )}
      </section>

      <section
        className="workbench-section workbench-capabilities"
        aria-labelledby="capabilities-title"
      >
        <div className="workbench-section-heading">
          <h2 id="capabilities-title">能力范围</h2>
        </div>
        <div className="capability-list">
          {capabilities.map((capability) => (
            <article className="capability-item" key={capability.title}>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workbench-section" aria-labelledby="writing-title">
        <div className="workbench-section-heading">
          <h2 id="writing-title">最近在写</h2>
          <Link className="workbench-text-link" href="/posts/">
            查看全部文章 <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="writing-list">
          {recentPosts.length > 0 ? (
            recentPosts.map((post) => (
              <Link
                className="writing-item"
                href={`/posts/${post.slug}/`}
                key={post.slug}
              >
                <span className="writing-copy">
                  <span className="writing-meta">
                    {formatDate(post.date)} · {post.tags[0]}
                  </span>
                  <strong>{post.title}</strong>
                  <span>{post.summary}</span>
                </span>
                <span className="writing-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))
          ) : (
            <p className="workbench-empty">文章正在整理中。</p>
          )}
        </div>
      </section>

      <section
        className="workbench-contact"
        id="contact"
        aria-labelledby="contact-title"
      >
        <div>
          <h2 id="contact-title">求职与合作</h2>
          <p>关于页有我的工程经历和 GitHub 主页。</p>
        </div>
        <Link
          className="workbench-button workbench-button-primary"
          href="/about/#contact"
        >
          联系我 <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </section>
  );
}
