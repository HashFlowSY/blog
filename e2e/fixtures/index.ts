import { test } from "@playwright/test";

const SITE_COPY = {
  posts: "文章",
  projects: "项目",
  about: "关于",
  allPosts: "技术写作",
  allProjects: "项目案例",
  recentPosts: "最近在写",
  featuredProjects: "代表项目",
  viewProjects: "查看项目",
  minutes: "min",
  source: "源代码",
  demo: "在线演示",
  aboutTitle: "关于我",
  skills: "技能介绍",
  experience: "经历介绍",
} as const;

export { SITE_COPY, test };
