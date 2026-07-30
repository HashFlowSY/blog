"use client";

import { useMemo, useState } from "react";

import { ProjectList } from "./project-list";

import type { ProjectCaseMeta } from "@/lib/content-catalog";

interface ProjectBoardProps {
  projects: ProjectCaseMeta[];
  tags: string[];
}

export function ProjectBoard({ projects, tags }: ProjectBoardProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const filteredProjects = useMemo(() => {
    if (!activeTag) return projects;
    return projects.filter((project) => project.tags.includes(activeTag));
  }, [activeTag, projects]);

  return (
    <>
      <div
        className="project-controls"
        data-filter-scope="projects"
        aria-label="项目筛选"
      >
        <button
          className="filter-button"
          type="button"
          aria-pressed={activeTag === null}
          onClick={() => setActiveTag(null)}
        >
          全部
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            className="filter-button"
            type="button"
            aria-pressed={activeTag === tag}
            onClick={() => setActiveTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <ProjectList projects={filteredProjects} />
    </>
  );
}
