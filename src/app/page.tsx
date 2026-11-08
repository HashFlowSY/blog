import Image from "next/image";
import Link from "next/link";

import { AssemblyWorkbench } from "@/components/home/assembly-workbench";
import { SectionNavigation } from "@/components/layout/section-navigation";
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
    index: "01",
    title: "AI 应用",
    detail: "让工具理解任务",
    description: "把模糊需求拆成可运行的 AI 功能、Agent 流程和工具链。",
  },
  {
    index: "02",
    title: "后端系统",
    detail: "让系统可靠运转",
    description: "从 API、数据库到性能优化，构建能长期维护的服务。",
  },
  {
    index: "03",
    title: "自动化交付",
    detail: "让想法真正落地",
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
    <section
      className="workbench-home page is-active"
      data-route-page="home"
      aria-labelledby="home-title"
    >
      <div className="workbench-grid">
        <SectionNavigation
          label="页面章节"
          variant="rail"
          items={[
            { id: "workbench", label: "工作台" },
            { id: "selected-work", label: "代表项目" },
            { id: "capabilities", label: "能力范围" },
            { id: "writing", label: "最近在写" },
          ]}
        />

        <div className="workbench-content">
          <div className="workbench-kicker">
            <span>独立思考，动手构建。</span>
            <span>个人作品与工程记录 / 持续更新</span>
          </div>

          <div className="workbench-hero" id="workbench">
            <div className="workbench-hero-copy">
              <p className="workbench-overline">
                <span className="studio-status" /> 开放全职机会与项目合作
              </p>
              <h1 id="home-title" data-od-id="home-headline">
                {SITE.name}
                <span>{SITE.role}</span>
              </h1>
              <p className="workbench-lede">
                把复杂需求拆开，
                <br />
                把可用的系统
                <span className="workbench-highlight">搭起来。</span>
              </p>
              <p className="workbench-intro">
                你好，我是 {SITE.name}。我用 AI、后端工程和自动化，
                把零散的想法连接成真正可用的产品。
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
                从需求到交付，也记录一路上的判断。
                <Link href="/about/">多了解一点 →</Link>
              </p>
              <div className="workbench-toolkit" aria-label="主要工作方向">
                <span>AI 应用</span>
                <span>后端系统</span>
                <span>自动化交付</span>
              </div>
            </div>

            <AssemblyWorkbench />
          </div>

          <div className="workbench-principle">
            <span>构建笔记 / 01</span>
            <p>好的系统，是让每一部分各就其位。</p>
            <a href="#selected-work">
              看看实际项目 <span aria-hidden="true">↓</span>
            </a>
          </div>

          <section
            className="workbench-section"
            id="selected-work"
            aria-labelledby="featured-work-title"
          >
            <div className="workbench-section-heading">
              <div>
                <p className="workbench-overline">01 / 从构想到落地</p>
                <h2 id="featured-work-title">代表项目</h2>
              </div>
              <Link className="workbench-text-link" href="/projects/">
                查看更多项目 <span aria-hidden="true">→</span>
              </Link>
            </div>

            {featuredProjectCase ? (
              <article className="featured-work" data-od-id="featured-project">
                <div className="featured-work-media">
                  <Image
                    src={assetPath(featuredProjectCase.cover)}
                    alt={`${featuredProjectCase.title}项目界面预览`}
                    fill
                    loading="eager"
                    sizes="(max-width: 800px) 100vw, 58vw"
                  />
                  <span className="featured-work-label">精选项目</span>
                </div>
                <div className="featured-work-copy">
                  <p className="workbench-project-meta">
                    {[
                      featuredProjectCase.role,
                      ...featuredProjectCase.tags.slice(0, 3),
                    ].join(" / ")}
                  </p>
                  <h3>{featuredProjectCase.title}</h3>
                  <p>{featuredProjectCase.description}</p>
                  <dl className="featured-work-details">
                    <div>
                      <dt>我的角色</dt>
                      <dd>{featuredProjectCase.role}</dd>
                    </div>
                    <div>
                      <dt>项目结果</dt>
                      <dd>{featuredProjectCase.result}</dd>
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
              </article>
            ) : (
              <p className="workbench-empty">项目案例正在整理中。</p>
            )}
          </section>

          <section
            className="workbench-section workbench-capabilities"
            id="capabilities"
            aria-labelledby="capabilities-title"
          >
            <div className="workbench-section-heading">
              <div>
                <p className="workbench-overline">02 / 一起构建的方式</p>
                <h2 id="capabilities-title">我能帮你把什么做好</h2>
              </div>
            </div>
            <div className="capability-list">
              {capabilities.map((capability) => (
                <article className="capability-item" key={capability.index}>
                  <span className="capability-index">{capability.index}</span>
                  <h3>{capability.title}</h3>
                  <span className="capability-detail">{capability.detail}</span>
                  <p>{capability.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section
            className="workbench-section writing-section"
            id="writing"
            aria-labelledby="writing-title"
          >
            <div className="workbench-section-heading">
              <div>
                <p className="workbench-overline">03 / 思考与工程记录</p>
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
              <p className="workbench-overline">04 / 下一个构想</p>
              <h2 id="contact-title">一起，把想法搭起来。</h2>
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
