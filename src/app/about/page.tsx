import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于这个搭建者",
  description: "个人介绍、技能、经历和联系入口。",
};

const skills = [
  ["AI 全栈开发", "产品 PRD 到前后端逻辑实现"],
  ["数据库", "SQL 撰写, 性能优化"],
  ["运维", "Linux, CI / CD"],
  ["交易", "还在试错"],
] as const;

const timeline = [
  ["2025.3 ～ now", "AI 驱动全栈工程师", "借助 AI 打通分析到上线的整套流程"],
  [
    "2022.6 ～ 2025.3",
    "Java 后端开发",
    "主要负责对应模块需求评审到实现；参与灰度设施建设；优化代码、SQL 执行效率",
  ],
  ["Before", "学习、写作、健身", "一直在尝试赚钱"],
  ["Contact", "联系入口", "这里暂时空缺"],
] as const;

export default function AboutPage() {
  return (
    <section
      className="page is-active"
      data-route-page="about"
      aria-labelledby="about-title"
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Shelter / rebuilt identity</p>
            <h1 id="about-title">关于这个搭建者</h1>
            <p className="lede">
              页面设计在「废料搭建」的基础上；个人介绍是主梁，技能是焊上的金属片，经历是临时棚里的旧标牌
            </p>
          </div>
        </div>

        <div className="about-grid" data-od-id="about-grid">
          <article className="bio-card large">
            <p className="meta">Personal brief</p>
            <h2>我将混乱的信息拆成小块组件，搭成清晰可追溯的系统</h2>
            <p>我热衷给自己制定计划并且实现，但也会有怠惰的时刻</p>
            <p>
              这个页面主要展示我的技能以及经历，目前主要是和开发相关；但我也对运营感兴趣
            </p>
            <div className="skill-grid" aria-label="技能介绍">
              {skills.map(([title, description]) => (
                <div className="skill-plate" key={title}>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </div>
              ))}
            </div>
          </article>

          <aside className="timeline" aria-label="经历介绍">
            {timeline.map(([date, title, description]) => (
              <article className="timeline-item" key={`${date}-${title}`}>
                <p className="meta">{date}</p>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}
