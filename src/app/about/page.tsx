import Link from "next/link";

import { SITE, siteUrl } from "@/lib/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我",
  description: `${SITE.name} 的工程经历、能力边界与求职、项目合作入口。`,
  alternates: { canonical: siteUrl("/about/") },
};

const skills = [
  ["AI 应用与 Agent", "需求拆解、提示链路、工具调用与效果评测。"],
  ["后端系统", "Java / TypeScript、API、SQL 与性能优化。"],
  ["全栈交付", "从 PRD 到前后端实现、测试与上线。"],
  ["工程效率", "Linux、CI / CD、可观测性与自动化流程。"],
] as const;

const timeline = [
  [
    "2025.03 — 至今",
    "AI 驱动全栈工程",
    "从需求、架构到前后端实现，推进 AI 应用和内部工具落地。",
  ],
  [
    "2022.06 — 2025.03",
    "Java 后端开发",
    "负责需求评审、接口实现与灰度发布，持续优化代码和 SQL 性能。",
  ],
  [
    "持续进行",
    "工程写作与工具实践",
    "把项目中的判断、流程和踩坑整理成可复用的技术记录。",
  ],
] as const;

export default function AboutPage() {
  return (
    <article className="paper-profile">
      <header className="paper-profile-intro">
        <p className="paper-role" id="about-label">
          关于我
        </p>
        <h1 aria-labelledby="about-label about-traits">
          <span id="about-traits">工程背景，产品视角。</span>
        </h1>
        <p>
          我是 {SITE.name}，{SITE.role}。我主要关注 AI
          应用、后端系统和自动化工具，习惯先确认问题与约束，再把方案推进到可以使用、验证和维护的状态。
        </p>
        <p className="paper-availability">
          4 年以上工程经验 · 开放全职机会与项目合作
        </p>
      </header>
      <div className="paper-profile-columns">
        <section aria-labelledby="skills-title">
          <h2 id="skills-title">能力范围</h2>
          <dl aria-label="技能介绍">
            {skills.map(([title, description]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="experience-title">
          <h2 id="experience-title">工程经历</h2>
          <dl aria-label="经历介绍">
            {timeline.map(([period, title, description]) => (
              <div key={title}>
                <dt>
                  <small>{period}</small>
                  {title}
                </dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <section
        className="paper-profile-contact"
        id="contact"
        aria-labelledby="contact-title"
      >
        <h2 id="contact-title">求职与合作</h2>
        <p>适合一起推进需要工程判断、快速验证和持续迭代的产品。</p>
        <div className="paper-actions">
          <a
            className="paper-text-link"
            href={SITE.githubProfile.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看 GitHub 主页 <span aria-hidden="true">↗</span>
          </a>
          <Link className="paper-text-link" href="/projects/">
            查看项目 <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </article>
  );
}
