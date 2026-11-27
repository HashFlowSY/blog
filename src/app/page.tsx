import Image from "next/image";
import Link from "next/link";

import { AssemblyWorkbench } from "@/components/home/assembly-workbench";
import { ProjectCover } from "@/components/project/project-cover";
import { getContentCatalog } from "@/lib/content-catalog";
import { assetPath, SITE, siteUrl } from "@/lib/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: siteUrl("/") },
};

const capabilities = [
  ["AI 应用", "拆解需求，实现 AI 功能，设计 Agent 流程并接入工具。"],
  ["后端系统", "开发 API，优化数据库查询和服务性能。"],
  ["自动化交付", "让构建、测试和部署自动运行，减少重复操作。"],
] as const;

export default async function HomePage() {
  const catalog = await getContentCatalog();
  const recentPosts = catalog.posts.slice(0, 3);
  const featuredProject = catalog.featuredProjectCases[0];
  const workbenchCase = catalog.projectCases.find(
    (item) => item.slug === "personal-blog",
  );

  return (
    <section className="paper-home" aria-labelledby="home-title">
      <div className="paper-hero">
        <div>
          <p className="paper-role" id="home-role">
            {SITE.role}
          </p>
          <h1 id="home-title" aria-labelledby="home-name home-role">
            <span id="home-name" lang="en">
              {SITE.name}
            </span>
            <span aria-hidden="true">.</span>
          </h1>
          <p className="paper-lede">
            从需求拆解到上线，交付 AI 应用、后端系统和自动化工具。
          </p>
          <p className="paper-availability">
            4 年以上工程经验 ·{" "}
            <Link href="/about/#contact">欢迎聊全职机会和项目合作</Link>
          </p>
          <div className="paper-actions">
            <Link className="paper-primary" href="/projects/">
              浏览项目 <span aria-hidden="true">↗</span>
            </Link>
            <Link className="paper-text-link" href="/posts/">
              读文章 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <AssemblyWorkbench>
          {workbenchCase && (
            <Link
              href={`/projects/${workbenchCase.slug}/`}
              id="workbench-case"
              data-project-entry={workbenchCase.slug}
            >
              打开项目 <span aria-hidden="true">↗</span>
            </Link>
          )}
        </AssemblyWorkbench>
      </div>

      <div className="paper-index">
        <section
          className="paper-band"
          id="selected-work"
          aria-labelledby="featured-work-title"
        >
          <header className="paper-band-heading">
            <h2 id="featured-work-title">
              代表项目{" "}
              <em lang="en" aria-hidden="true">
                Project
              </em>
            </h2>
            <Link href="/projects/">
              全部项目 <span aria-hidden="true">↗</span>
            </Link>
          </header>
          {featuredProject ? (
            <Link
              className="paper-project"
              href={`/projects/${featuredProject.slug}/`}
              id={`featured-${featuredProject.slug}`}
              data-project-entry={featuredProject.slug}
              aria-labelledby="featured-title featured-open"
            >
              <div>
                <p className="paper-date">{featuredProject.duration}</p>
                <h3 id="featured-title">{featuredProject.title}</h3>
                <p>{featuredProject.result}</p>
                <span className="paper-project-open" id="featured-open">
                  查看项目详情 <span aria-hidden="true">↗</span>
                </span>
              </div>
              <ProjectCover
                slug={featuredProject.slug}
                className="paper-project-cover"
              >
                <Image
                  src={assetPath(featuredProject.cover)}
                  alt={`${featuredProject.title}项目界面预览`}
                  fill
                  sizes="(max-width: 650px) 35vw, 28vw"
                />
              </ProjectCover>
            </Link>
          ) : (
            <p className="paper-empty">项目案例正在整理中。</p>
          )}
        </section>
        <section className="paper-band" aria-labelledby="writing-title">
          <header className="paper-band-heading">
            <h2 id="writing-title">
              最新文章{" "}
              <em lang="en" aria-hidden="true">
                Writing
              </em>
            </h2>
            <Link href="/posts/">
              查看全部文章 <span aria-hidden="true">↗</span>
            </Link>
          </header>
          <div className="paper-writing">
            {recentPosts.length ? (
              recentPosts.map((post) => (
                <Link key={post.slug} href={`/posts/${post.slug}/`}>
                  <span>
                    <span className="paper-date">
                      <time dateTime={post.date}>
                        {post.date.replaceAll("-", ".")}
                      </time>{" "}
                      · {post.tags[0]}
                    </span>
                    <strong>{post.title}</strong>
                  </span>
                  <span aria-hidden="true">↗</span>
                </Link>
              ))
            ) : (
              <p className="paper-empty">文章正在整理中。</p>
            )}
          </div>
        </section>
        <section className="paper-band" aria-labelledby="capabilities-title">
          <header className="paper-band-heading">
            <h2 id="capabilities-title">能力范围</h2>
          </header>
          <dl className="paper-capabilities">
            {capabilities.map(([title, description]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section
          className="paper-band"
          id="contact"
          aria-labelledby="contact-title"
        >
          <header className="paper-band-heading">
            <h2 id="contact-title">求职与合作</h2>
          </header>
          <div className="paper-contact">
            <p>
              可以先<a href="#selected-work">查看代表项目</a>
              ，也可以到关于页了解我的工程经历。
            </p>
            <Link className="paper-text-link" href="/about/#contact">
              联系我 <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
