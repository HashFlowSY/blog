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
    "基于 Next.js 16 静态导出的中文个人作品站，包含类型安全的内容管线、CJK 阅读时间、标签感知推荐和完整测试验证。",
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
