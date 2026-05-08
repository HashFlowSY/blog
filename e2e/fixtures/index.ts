import { test as base } from "@playwright/test";

type Locale = "zh-CN";

const LOCALES = {
  "zh-CN": {
    home: "首页",
    posts: "文章",
    projects: "项目",
    about: "关于",
    siteName: "Scraplog",
    allPosts: "档案室",
    allProjects: "项目零件板",
    recentPosts: "内容介绍",
    featuredProjects: "项目零件板",
    all: "全部",
    noResults: "暂无文章",
    readMore: "继续读取",
    viewPosts: "进入文章档案",
    viewProjects: "查看项目板",
    publishedAt: "发布",
    updatedAt: "更新于",
    toc: "文章章节",
    minutes: "min",
    source: "源代码",
    demo: "在线演示",
    aboutTitle: "关于这个搭建者",
    skills: "技能介绍",
    experience: "经历介绍",
    notFound: "404",
    notFoundDesc: "这条路线没有铺好",
    backHome: "回到首页",
  },
} as const;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
const test = base.extend<{}>({});

export { LOCALES, test };
export type { Locale };
