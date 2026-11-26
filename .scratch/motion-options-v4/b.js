"use strict";
(() => {
    const { BlogContent: data, BlogPreview: preview } = window;
    const esc = (v) => v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const day = (v) => v.replaceAll("-", ".");
    const srcArt = "https://commons.wikimedia.org/wiki/File:The_ferns_of_Great_Britain_and_Ireland_(Plate_XXX)_BHL273805.jpg";
    const nav = [["home", "首页"], ["posts", "文章"], ["projects", "项目"], ["about", "关于"]];
    const part = (route) => route.startsWith("post/") ? "posts" : route === "project" ? "projects" : route;
    const svgPaths = {
        arrow: "M3 10h13m-5-5 5 5-5 5", back: "M17 10H4m5-5-5 5 5 5", angled: "M4 16 16 4M6 4h10v10",
        search: "M14 14l4 4M15 9A6 6 0 1 1 3 9a6 6 0 0 1 12 0", book: "M2.5 4h5a5 5 0 0 1 2.5 1 5 5 0 0 1 2.5-1h5v12h-5a5 5 0 0 0-2.5 1 5 5 0 0 0-2.5-1h-5zM10 5v12"
    };
    const icon = (k, size = 16) => `<svg aria-hidden="true" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 20 20"><path d="${svgPaths[k]}"/></svg>`;
    const chapter = (route, heading) => `#${route}?at=${encodeURIComponent("user-content-" + heading)}`;
    const searchIndex = data.posts.map(post => {
        const doc = new DOMParser().parseFromString(post.html, "text/html");
        const blocks = Array.from(doc.body.querySelectorAll("p,li,th,td,h2,h3,h4")).map(el => el.textContent?.trim() || "");
        return { post, blocks };
    });
    const questions = [
        { slug: "2026-05-02", heading: "基本流程", label: "做 Codex 桌宠时，先确认什么？", topic: "桌宠制作", quote: "启动后给出素材或文字描述，skill 会先生成一张基础参考图；确认方向后，再继续制作动作和运行所需的资源。" },
        { slug: "2026-04-30", heading: "中转站", label: "中转站的「倍率」是什么意思？", topic: "计费术语", quote: "中转站相对官方 API 价格的定价系数。倍率 1 = 同价，0.8 = 八折。" },
        { slug: "2026-04-30", heading: "使用前的检查清单", label: "使用中转站前，该核对哪些风险？", topic: "风险识别", quote: "能否说明请求实际发送到哪里，是否保留日志或训练数据。", second: "是否明确模型来源、倍率和失败退款规则。" }
    ];
    const questionLink = (q) => chapter("post/" + q.slug, q.heading);
    const postFor = (slug) => data.posts.find(post => post.slug === slug);
    let query = "", topic = "";
    function siteHeader(route) {
        return `<header class="mast"><div class="mast-inner"><a href="#home" class="brand" aria-label="Hashflow 首页"><i class="leaf-mark" aria-hidden="true"></i><span>Hashflow</span></a><nav aria-label="主导航">${nav.map(([r, label]) => `<a href="#${r}"${part(route) === r ? ' aria-current="location"' : ""}>${label}</a>`).join("")}</nav><a href="index.html" class="compare">比较方案 ${icon("angled", 12)}</a></div></header>`;
    }
    function link(href, label, external = false) { return `<a class="text-link" href="${href}">${esc(label)} ${icon(external ? "angled" : "arrow", 15)}</a>`; }
    function back(route) { return `<a href="#${route}" class="back" data-return>${icon("back", 14)} 返回</a>`; }
    function cover() {
        return `<section class="cover"><div class="cover-art" aria-hidden="true"></div><div class="ribbon" aria-hidden="true"></div>
    <div class="cover-type"><p class="eyebrow">Hashflow 的工程手记</p><h1>常青笔记</h1><p class="cover-copy">我是 Hashflow，做 AI 应用和后端系统。这里收着我的实践记录，也写下这个 <a href="#project">Personal Blog</a> 是怎么做的。</p></div>
    <a class="art-source" href="${srcArt}" target="_blank" rel="noreferrer">Henry Bradbury · 1855 ${icon("angled", 10)}</a></section>`;
    }
    function excerpt(q, i) {
        return `<details class="question" data-question="${i}"${i === 0 ? " open" : ""}><summary><div><span class="category">${esc(q.topic)}</span><h3>${esc(q.label)}</h3></div><span class="toggle" aria-hidden="true"></span></summary>
    <div class="excerpt"><blockquote><p>${esc(q.quote)}</p>${q.second ? `<p>${esc(q.second)}</p>` : ""}</blockquote><div class="quote-source"><cite>《${esc(postFor(q.slug).title)}》</cite><a class="chapter" href="${questionLink(q)}">读原文 · ${esc(q.heading)} ${icon("arrow", 14)}</a></div></div></details>`;
    }
    function row(post, blurb = esc(post.summary)) {
        return `<a class="post-row" href="#post/${post.slug}"><div><span class="post-meta">${day(post.date)}<i>·</i>${esc(post.tags[0])}</span><strong>${esc(post.title)}</strong><p>${blurb}</p></div>${icon("angled", 17)}</a>`;
    }
    function projectEntry() {
        return `<article class="project-entry"><div class="project-mini"><img src="${data.cover}" width="900" height="682" alt="博客首页的手绘工作台"></div><div class="project-words"><span class="category">项目手记</span><h3><a href="#project">Personal Blog</a></h3><p>用 Markdown 写作的中文技术博客与作品集，支持站内全文检索。</p>${link("#project", "阅读项目案例")}</div></article>`;
    }
    function home() {
        return `<div class="home-spread">${cover()}<section class="clippings"><div class="clip-title"><span class="eyebrow">文章摘录</span><h2>从问题读起</h2></div>${questions.map(excerpt).join("")}</section></div>
    <div class="home-lower"><section><div class="section-title"><h2>完整文章</h2>${link("#posts", "文章目录")}</div>${data.posts.map(p => row(p)).join("")}</section><section class="project-aside">${projectEntry()}</section></div>`;
    }
    function head(title, meta, description) {
        return `<header class="page-head"><span class="eyebrow">${esc(meta)}</span><h1>${esc(title)}</h1>${description ? `<p>${esc(description)}</p>` : ""}</header>`;
    }
    function posts() {
        const tags = Array.from(new Set(data.posts.flatMap(p => p.tags)));
        return `<div class="browse">${head("文章目录", "常青笔记", "从题名、主题或正文中的一个词，找到需要的记录。")}<div class="archive-tools"><label class="search">${icon("search", 18)}<input type="search" aria-label="搜索文章" placeholder="搜索文章全文" value="${esc(query)}"></label><div class="topic-list" role="group" aria-label="按主题筛选">${["", ...tags].map(tag => `<button type="button" data-tag="${esc(tag)}" aria-pressed="${tag === topic}">${esc(tag || "全部主题")}</button>`).join("")}</div></div>
    <div class="result-count" aria-live="polite"></div><div id="results"></div></div>`;
    }
    function projects() {
        return `<div class="browse">${head("项目手记", "常青笔记", "记录我在项目里做了什么，以及这些做法怎样验证。")}${projectEntry()}</div>`;
    }
    function articleLinks(post) {
        const related = questions.filter(q => q.slug === post.slug);
        return `<div class="marginal"><h2>这篇回答了</h2>${related.map(q => link(questionLink(q), q.label)).join("")}</div><div class="marginal slim"><h2>收录于</h2>${link("#project", "Personal Blog")}</div>`;
    }
    function article(post) {
        return `<div class="reading">${back("posts")}${head(post.title, "文章 · " + day(post.date) + " · " + post.tags.join(" / "), post.summary)}
    <div class="read-columns"><aside class="side-notes">${articleLinks(post)}</aside><article class="prose">${post.html}</article></div>
    <div class="reading-end"><h2>继续读</h2>${data.posts.filter(p => p.slug !== post.slug).map(p => row(p)).join("")}</div></div>`;
    }
    function project() {
        const p = data.project;
        return `<div class="reading">${back("projects")}${head(p.title, "项目手记", p.result)}
    <div class="project-context"><div><span class="category">我的角色</span><p>${esc(p.role)}</p></div><div><span class="category">技术栈</span><p>${p.tags.map(esc).join(" · ")}</p></div></div>
    <div class="read-columns"><aside class="side-notes"><div class="marginal"><h2>从问题读起</h2>${link(chapter("project", "文章检索"), "只记得正文的一个词，能搜到吗？")}${link(chapter("project", "首页交互工作台"), "首页的手绘工作台怎样动起来？")}</div><div class="marginal slim"><h2>站内文章</h2>${data.posts.map(p => link("#post/" + p.slug, p.title)).join("")}</div></aside><article class="prose">${p.html}</article></div></div>`;
    }
    function about() {
        const skills = [["AI 应用与 Agent", "需求拆解、提示链路、工具调用与效果评测。"], ["后端系统", "Java / TypeScript、API、SQL 与性能优化。"], ["全栈交付", "从 PRD 到前后端实现、测试与上线。"], ["工程效率", "Linux、CI / CD、可观测性与自动化流程。"]];
        const jobs = [["2025.03 — 至今", "AI 驱动全栈工程", "从需求、架构到前后端实现，推进 AI 应用和内部工具落地。"], ["2022.06 — 2025.03", "Java 后端开发", "负责需求评审、接口实现与灰度发布，持续优化代码和 SQL 性能。"]];
        return `<div class="browse about">${head("关于 Hashflow", "AI 全栈工程师", "我主要关注 AI 应用、后端系统和自动化工具，从需求澄清到上线，把复杂问题拆成可执行、可验证的系统。")}
    <p class="author-note">在 <a href="#project">Personal Blog</a> 写工程记录。关于工具的一次具体尝试，可以从 <a href="#post/2026-05-02">用 Codex 定制桌面宠物</a> 开始读。</p>
    <section><h2>能力范围</h2><dl>${skills.map(([title, desc]) => `<div><dt>${title}</dt><dd>${desc}</dd></div>`).join("")}</dl></section>
    <section><h2>工程经历</h2><dl>${jobs.map(([time, title, desc]) => `<div><dt>${time}</dt><dd><strong>${title}</strong><p>${desc}</p></dd></div>`).join("")}</dl></section>
    <section id="contact"><h2>求职与合作</h2><p>目前开放全职机会与项目合作。</p>${link("https://github.com/HashFlowSY", "查看 GitHub 主页", true)}</section></div>`;
    }
    function render(route) {
        let content = "";
        if (route === "project")
            content = project();
        else if (route === "projects")
            content = projects();
        else if (route === "posts")
            content = posts();
        else if (route === "about")
            content = about();
        else if (route.startsWith("post/")) {
            const p = postFor(route.slice(5));
            content = p ? article(p) : posts();
        }
        else
            content = home();
        return siteHeader(route) + `<div class="shell"><div class="pane">${content}</div><footer><span>Hashflow · 常青笔记演示</span>${link("#about", "关于与联系")}</footer></div>`;
    }
    function filter() {
        const word = query.trim().toLocaleLowerCase();
        const found = searchIndex.filter(({ post }) => !topic || post.tags.includes(topic)).flatMap(({ post, blocks }) => {
            if (!word || [post.title, post.summary, ...post.tags].some(v => v.toLocaleLowerCase().includes(word)))
                return [row(post)];
            const hit = blocks.find(block => block.toLocaleLowerCase().includes(word));
            if (!hit)
                return [];
            const at = hit.toLocaleLowerCase().indexOf(word);
            const prefix = esc(hit.slice(Math.max(0, at - 20), at)), match = esc(hit.slice(at, at + word.length)), suffix = esc(hit.slice(at + word.length, at + word.length + 35));
            return [row(post, (at > 20 ? "…" : "") + prefix + "<mark>" + match + "</mark>" + suffix + (at + word.length + 35 < hit.length ? "…" : ""))];
        });
        document.querySelector(".result-count").textContent = `${found.length} 篇文章`;
        document.querySelector("#results").innerHTML = found.join("") || '<p class="empty">没有找到文章。可以换个关键词，或选择「全部主题」。</p>';
    }
    function afterRender(route) {
        if (route !== "posts")
            return;
        const input = document.querySelector("input[type=search]");
        const buttons = Array.from(document.querySelectorAll("[data-tag]"));
        input.addEventListener("input", () => { query = input.value; filter(); });
        buttons.forEach(button => button.addEventListener("click", () => { topic = button.dataset.tag || ""; buttons.forEach(el => el.setAttribute("aria-pressed", String(el.dataset.tag === topic))); filter(); }));
        filter();
    }
    preview.start({ render, afterRender });
})();
