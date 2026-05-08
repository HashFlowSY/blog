import { ProjectBoard } from "@/components/project/project-board";
import { getAllProjectsMeta } from "@/lib/projects";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "项目零件板",
  description: "项目简介、状态、标签和跳转链接组成的工作台。",
};

export default function ProjectsPage() {
  const projects = getAllProjectsMeta("zh-CN");
  const tags = Array.from(
    new Set(projects.flatMap((project) => project.tags)),
  ).sort();

  return (
    <section
      className="page is-active"
      data-route-page="projects"
      aria-labelledby="projects-title"
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workbench / link board</p>
            <h1 id="projects-title">项目零件板</h1>
            <p className="lede">
              项目页展示页面，重点展示简介、状态、标签和跳转链接
            </p>
          </div>
          <p></p>
        </div>
        <ProjectBoard projects={projects} tags={tags} />
      </div>
    </section>
  );
}
