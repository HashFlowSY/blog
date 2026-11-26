import Link from "next/link";

import { ProjectList } from "@/components/project/project-list";
import { getContentCatalog } from "@/lib/content-catalog";
import { SITE, siteUrl } from "@/lib/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "项目案例",
  description: `${SITE.name} 的项目案例：问题、角色、关键决策、实现过程与结果。`,
  alternates: {
    canonical: siteUrl("/projects/"),
  },
};

export default async function ProjectsPage() {
  const catalog = await getContentCatalog();
  const projectCases = catalog.projectCases.slice();

  return (
    <section className="content-page" aria-labelledby="projects-title">
      <header className="content-list-intro">
        <div>
          <p className="collection-eyebrow" lang="en">
            Selected projects
          </p>
          <h1 id="projects-title">项目案例</h1>
          <p>我做过的项目、承担的角色，以及可以查证的结果。</p>
        </div>
        <span
          className="collection-count"
          aria-label={`${projectCases.length} 个项目`}
        >
          {String(projectCases.length).padStart(2, "0")}
        </span>
      </header>

      <section className="content-list-section" aria-label="项目案例列表">
        <ProjectList projects={projectCases} />
      </section>

      <section
        className="collection-contact"
        aria-labelledby="projects-contact-title"
      >
        <div>
          <h2 id="projects-contact-title">有类似的问题需要推进？</h2>
          <p>可以从需求、技术方案或现有系统开始聊。</p>
        </div>
        <Link className="content-text-link" href="/about/#contact">
          联系我
        </Link>
      </section>
    </section>
  );
}
