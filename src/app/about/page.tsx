import Link from "next/link";

import { SITE } from "@/lib/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我",
  description: `${SITE.name} 的工程经历、能力边界与求职、项目合作入口。`,
};

const skills = [
  {
    index: "01",
    title: "AI 应用与 Agent",
    description: "需求拆解、提示链路、工具调用与效果评测。",
  },
  {
    index: "02",
    title: "后端系统",
    description: "Java / TypeScript、API、SQL 与性能优化。",
  },
  {
    index: "03",
    title: "全栈交付",
    description: "从 PRD 到前后端实现、测试与上线。",
  },
  {
    index: "04",
    title: "工程效率",
    description: "Linux、CI / CD、可观测性与自动化流程。",
  },
] as const;

const timeline = [
  {
    date: "2025.03 — 至今",
    title: "AI 驱动全栈工程",
    description: "从需求、架构到前后端实现，推进 AI 应用和内部工具落地。",
  },
  {
    date: "2022.06 — 2025.03",
    title: "Java 后端开发",
    description: "负责需求评审、接口实现与灰度发布，持续优化代码和 SQL 性能。",
  },
  {
    date: "持续进行",
    title: "工程写作与工具实践",
    description: "把项目中的判断、流程和踩坑整理成可复用的技术记录。",
  },
] as const;

export default function AboutPage() {
  return (
    <section
      className="page portfolio-page portfolio-about-page is-active"
      data-route-page="about"
      aria-labelledby="about-title"
    >
      <div className="portfolio-shell">
        <header className="portfolio-page-intro portfolio-about-intro">
          <div>
            <p className="portfolio-overline">About / working profile</p>
            <h1 id="about-title">关于我</h1>
            <p className="portfolio-lede">
              从需求澄清到上线，把复杂问题拆成可执行、可验证的系统。
            </p>
          </div>
          <dl className="portfolio-page-stats">
            <div>
              <dt>工程经历</dt>
              <dd>4 年+</dd>
            </div>
            <div>
              <dt>当前方向</dt>
              <dd>AI 全栈</dd>
            </div>
          </dl>
        </header>

        <div className="portfolio-about-layout">
          <article className="portfolio-profile-card">
            <p className="portfolio-overline">Profile / 01</p>
            <h2>工程背景，产品视角，完整交付。</h2>
            <p>
              我主要关注 AI
              应用、后端系统和自动化工具，习惯先确认问题与约束，再把方案推进到可以使用、验证和维护的状态。
            </p>
            <p>
              目前开放全职机会与项目合作。适合一起推进需要工程判断、快速验证和持续迭代的产品。
            </p>
          </article>

          <section
            className="portfolio-about-section"
            aria-labelledby="skills-title"
          >
            <div className="portfolio-section-heading">
              <div>
                <p className="portfolio-overline">Capabilities / toolkit</p>
                <h2 id="skills-title">能力范围</h2>
              </div>
            </div>
            <div className="portfolio-skill-grid" aria-label="技能介绍">
              {skills.map((skill) => (
                <article className="portfolio-skill-card" key={skill.index}>
                  <span>{skill.index}</span>
                  <h3>{skill.title}</h3>
                  <p>{skill.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section
          className="portfolio-experience-section"
          aria-labelledby="experience-title"
        >
          <div className="portfolio-section-heading">
            <div>
              <p className="portfolio-overline">Experience / timeline</p>
              <h2 id="experience-title">经历</h2>
            </div>
          </div>
          <div className="portfolio-timeline" aria-label="经历介绍">
            {timeline.map((item, index) => (
              <article
                className="portfolio-timeline-item"
                key={`${item.date}-${item.title}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item.date}</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="portfolio-contact-band portfolio-about-contact"
          id="contact"
          aria-labelledby="contact-title"
        >
          <div>
            <p className="portfolio-overline">Contact / open to work</p>
            <h2 id="contact-title">求职或合作，欢迎联系我。</h2>
            <p>可以通过 GitHub 了解我的工作并继续交流。</p>
          </div>
          <div className="portfolio-link-row">
            <a
              className="portfolio-button portfolio-button-primary"
              href={SITE.githubProfile.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {SITE.githubProfile.label}
            </a>
            <Link className="portfolio-button" href="/projects/">
              查看项目
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
