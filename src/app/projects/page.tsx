import Link from "next/link";

import { ProjectList } from "@/components/project/project-list";
import { getAllProjectsMeta } from "@/lib/projects";
import { SITE } from "@/lib/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "项目案例",
  description: `${SITE.name} 的项目案例：问题、角色、关键决策、实现过程与结果。`,
};

export default function ProjectsPage() {
  const projects = getAllProjectsMeta("zh-CN");
  const templateCount = projects.filter((project) => project.template).length;
  const realCount = projects.length - templateCount;

  return (
    <section
      className="page portfolio-page portfolio-projects-page is-active"
      data-route-page="projects"
      aria-labelledby="projects-title"
    >
      <div className="portfolio-shell">
        <header className="portfolio-page-intro">
          <div>
            <p className="portfolio-overline">Projects / case studies</p>
            <h1 id="projects-title">项目案例</h1>
            <p className="portfolio-lede">
              从问题、角色和关键决策出发，说明一个项目如何被推进到可用、可维护的状态。
            </p>
          </div>
          <dl className="portfolio-page-stats">
            <div>
              <dt>真实项目</dt>
              <dd>{realCount.toString().padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>示例模板</dt>
              <dd>{templateCount.toString().padStart(2, "0")}</dd>
            </div>
          </dl>
        </header>

        <section
          className="portfolio-section portfolio-projects-section"
          aria-label="项目案例列表"
        >
          <ProjectList projects={projects} />
        </section>

        <section
          className="portfolio-contact-band"
          aria-labelledby="projects-contact-title"
        >
          <div>
            <p className="portfolio-overline">Contact / open to work</p>
            <h2 id="projects-contact-title">有类似的问题需要推进？</h2>
            <p>可以从需求、技术方案或现有系统开始聊。</p>
          </div>
          <Link className="portfolio-button" href="/about/#contact">
            联系我
          </Link>
        </section>
      </div>
    </section>
  );
}
