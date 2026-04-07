"use client";

import { FadeIn } from "@/components/motion/fade-in";

import { ProjectCard } from "./project-card";

import type { ProjectMeta } from "@/lib/projects";

interface ProjectListProps {
  projects: ProjectMeta[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {projects.map((project, i) => (
        <FadeIn key={project.slug} delay={i * 75}>
          <ProjectCard project={project} />
        </FadeIn>
      ))}
    </div>
  );
}
