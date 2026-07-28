import Image from "next/image";
import Link from "next/link";

import { getAllPostsMeta } from "@/lib/posts";
import { getFeaturedProjects } from "@/lib/projects";
import { assetPath } from "@/lib/site";

const capabilities = [
  {
    index: "01",
    title: "AI 应用",
    description: "把模糊需求拆成可运行的 AI 功能、Agent 流程和工具链。",
  },
  {
    index: "02",
    title: "后端系统",
    description: "从 API、数据库到性能优化，构建能长期维护的服务。",
  },
  {
    index: "03",
    title: "自动化交付",
    description: "打通需求、开发、测试和部署，减少重复劳动。",
  },
] as const;

function formatDate(date: string): string {
  return date.replaceAll("-", ".");
}

export default function HomePage() {
  const recentPosts = getAllPostsMeta("zh-CN").slice(0, 3);
  const featuredProject = getFeaturedProjects("zh-CN")[0] ?? null;

  return (
    <section
      className="workbench-home page is-active"
      data-route-page="home"
      aria-labelledby="home-title"
    >
      <div className="workbench-grid">
        <div className="workbench-index" aria-hidden="true">
          <span>01</span>
          <span>02</span>
          <span>03</span>
          <span>04</span>
          <span>05</span>
        </div>

        <div className="workbench-content">
          <div className="workbench-kicker">
            <span>Hashflow / AI 全栈工程师</span>
            <span>AI 应用 · 后端系统 · 自动化交付</span>
          </div>

          <div className="workbench-hero">
            <div className="workbench-hero-copy">
              <p className="workbench-overline">Home / profile 01</p>
              <h1 id="home-title" data-od-id="home-headline">
                Hashflow
                <span>AI 全栈工程师</span>
              </h1>
              <p className="workbench-lede">
                把复杂需求拆成可上线、可维护的系统。
              </p>
              <p className="workbench-intro">
                我使用 AI、后端工程和自动化工具，把想法推进成真实可用的产品，
                也记录过程中值得复用的判断和方法。
              </p>
              <div className="workbench-actions">
                <Link
                  className="workbench-button workbench-button-primary"
                  href="/projects/"
                >
                  查看项目 <span aria-hidden="true">→</span>
                </Link>
                <Link className="workbench-button" href="/about/#contact">
                  联系我 <span aria-hidden="true">↗</span>
                </Link>
              </div>
              <p className="workbench-contact-line">
                求职或合作，欢迎联系我。
                <Link href="/about/#contact">了解合作方式 →</Link>
              </p>
            </div>

            <figure className="workbench-hero-visual">
              <Image
                src={assetPath("/assets/workbench-hero.png")}
                alt="工程师工作台的蓝图插画"
                fill
                preload
                sizes="(max-width: 800px) 100vw, 52vw"
              />
              <figcaption>Build systems that last.</figcaption>
            </figure>
          </div>

          <section
            className="workbench-section"
            aria-labelledby="featured-work-title"
          >
            <div className="workbench-section-heading">
              <div>
                <p className="workbench-overline">Projects / selected work</p>
                <h2 id="featured-work-title">代表项目</h2>
              </div>
              <Link className="workbench-text-link" href="/projects/">
                查看更多项目 <span aria-hidden="true">→</span>
              </Link>
            </div>

            {featuredProject ? (
              <article className="featured-work" data-od-id="featured-project">
                <div className="featured-work-media">
                  <Image
                    src={assetPath(
                      featuredProject.cover ?? "/assets/content-dashboard.png",
                    )}
                    alt={`${featuredProject.title}项目界面预览`}
                    fill
                    loading="eager"
                    sizes="(max-width: 800px) 100vw, 58vw"
                  />
                  <span className="featured-work-label">精选项目</span>
                </div>
                <div className="featured-work-copy">
                  <p className="workbench-project-meta">
                    {featuredProject.role ?? "独立设计与开发"} /{" "}
                    {featuredProject.tags.slice(0, 3).join(" · ")}
                  </p>
                  <h3>{featuredProject.title}</h3>
                  <p>{featuredProject.description}</p>
                  <dl className="featured-work-details">
                    <div>
                      <dt>我的角色</dt>
                      <dd>{featuredProject.role ?? "独立设计与开发"}</dd>
                    </div>
                    <div>
                      <dt>项目结果</dt>
                      <dd>{featuredProject.result ?? "项目结果待补充"}</dd>
                    </div>
                  </dl>
                  <div className="workbench-tags" aria-label="项目技术标签">
                    {featuredProject.tags.slice(0, 5).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <Link
                    className="workbench-text-link"
                    href={`/projects/${featuredProject.slug}/`}
                  >
                    查看项目详情 <span aria-hidden="true">→</span>
                  </Link>
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
              <div>
                <p className="workbench-overline">Capabilities / how I work</p>
                <h2 id="capabilities-title">我能帮你把什么做好</h2>
              </div>
            </div>
            <div className="capability-list">
              {capabilities.map((capability) => (
                <article className="capability-item" key={capability.index}>
                  <span className="capability-index">{capability.index}</span>
                  <h3>{capability.title}</h3>
                  <p>{capability.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section
            className="workbench-section writing-section"
            aria-labelledby="writing-title"
          >
            <div className="workbench-section-heading">
              <div>
                <p className="workbench-overline">Writing / recent notes</p>
                <h2 id="writing-title">最近在写</h2>
              </div>
              <Link className="workbench-text-link" href="/posts/">
                查看全部文章 <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="writing-list" data-od-id="recent-posts">
              {recentPosts.length > 0 ? (
                recentPosts.map((post, index) => (
                  <Link
                    className="writing-item"
                    href={`/posts/${post.slug}/`}
                    key={post.slug}
                  >
                    <span className="writing-index">
                      {(index + 1).toString().padStart(2, "0")}
                    </span>
                    <span className="writing-copy">
                      <span className="writing-meta">
                        {formatDate(post.date)} · {post.tags[0] ?? "记录"}
                      </span>
                      <strong>{post.title}</strong>
                      {post.summary && <span>{post.summary}</span>}
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
              <p className="workbench-overline">Contact / open to work</p>
              <h2 id="contact-title">求职或合作，欢迎联系我。</h2>
              <p>
                如果你正在做一个需要从想法推进到上线的项目，可以联系我聊聊。
              </p>
            </div>
            <Link
              className="workbench-button workbench-button-primary"
              href="/about/"
            >
              查看关于我 <span aria-hidden="true">→</span>
            </Link>
          </section>
        </div>
      </div>
    </section>
  );
}
