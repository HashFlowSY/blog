import { test } from "@playwright/test";

const SITE_COPY = {
  posts: "文章",
  projects: "项目",
  about: "关于",
  allProjects: "项目案例",
  recentPosts: "最近在写",
  featuredProjects: "代表项目",
  viewFeaturedProject: "查看代表项目",
  source: "源代码",
  demo: "在线演示",
  aboutTitle: "关于我",
  skills: "技能介绍",
  experience: "经历介绍",
} as const;

const STABLE_POST = {
  slug: "2026-04-30",
  title: "AI 服务中转站：常见术语与风险清单",
  description:
    "梳理官方订阅、API 转发、逆向渠道和计费倍率等常见术语，并标出需要重点留意的风险。",
} as const;

const STABLE_PROJECT = {
  slug: "personal-blog",
  title: "Personal Blog",
  description:
    "Hashflow 的中文技术博客与作品集，包含手绘 3D 工作台、文章全文搜索和构建时 Markdown 渲染。",
} as const;

function routeForPost(slug: string = STABLE_POST.slug): string {
  return `/posts/${slug}/`;
}

function routeForProject(slug: string = STABLE_PROJECT.slug): string {
  return `/projects/${slug}/`;
}

export {
  SITE_COPY,
  STABLE_POST,
  STABLE_PROJECT,
  routeForPost,
  routeForProject,
  test,
};
