"use strict";
(() => {
    const { posts, project } = BlogContent;
    const linkToMethod = "#project?at=user-content-cjk-阅读时间";
    const linkToLab = "#project?at=inline-lab";
    const nav = [
        ["home", "首页"],
        ["projects", "项目"],
        ["posts", "文章"],
        ["about", "关于"],
    ];
    const escapeText = (text) => text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    const normalize = (text) => text.trim().replace(/\s+/gu, " ");
    const letters = /[\p{Letter}\p{Letter_Number}]/u;
    const eastAsian = /[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Hangul}\p{Script_Extensions=Bopomofo}]/u;
    const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
    // Same plain-prose counting and single final rounding as src/lib/markdown/analyze.ts.
    function statistics(text) {
        let cjkCharacters = 0;
        let otherWords = 0;
        const remaining = Array.from(normalize(text).normalize("NFC"), (character) => {
            if (letters.test(character) && eastAsian.test(character)) {
                cjkCharacters++;
                return " ";
            }
            return character;
        }).join("");
        for (const segment of segmenter.segment(remaining))
            if (segment.isWordLike)
                otherWords++;
        return {
            cjkCharacters,
            otherWords,
            minutes: Math.ceil((2 * cjkCharacters + 5 * otherWords) / 1000),
        };
    }
    function proseText(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const blocks = [];
        let fragments = "";
        const flush = () => {
            const text = normalize(fragments);
            if (text)
                blocks.push(text);
            fragments = "";
        };
        const walk = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                fragments += node.textContent ?? "";
                return;
            }
            if (!(node instanceof Element) ||
                node.matches("[data-footnote-ref],[data-footnote-backref],.sr-only"))
                return;
            if (node.matches("pre")) {
                flush();
                return;
            }
            if (node.matches("br")) {
                fragments += " ";
                return;
            }
            const boundary = node.matches("h1,h2,h3,h4,h5,h6,p,li,ul,ol,blockquote,table,tr,section,hr");
            if (boundary)
                flush();
            node.childNodes.forEach(walk);
            if (boundary)
                flush();
            if (node.matches("th,td"))
                fragments += " ";
        };
        walk(doc.body);
        flush();
        return blocks.join("\n");
    }
    const articleTexts = new Map(posts.map((post) => [post.slug, proseText(post.html)]));
    const pet = posts.find((post) => post.slug === "2026-05-02");
    const glossary = posts.find((post) => post.slug === "2026-04-30");
    const presets = [
        {
            id: "mixed",
            label: "中英混排",
            value: "用 Markdown 写下实践，把想法交给代码验证。\n\nKeep a small notebook. Build a prototype, test it, then write down what changed.",
        },
        { id: pet.slug, label: "桌宠原文", value: articleTexts.get(pet.slug) },
        {
            id: glossary.slug,
            label: "术语原文",
            value: articleTexts.get(glossary.slug),
        },
    ];
    let sampleId = presets[0].id;
    let sampleText = presets[0].value;
    let query = "";
    const format = new Intl.NumberFormat("zh-CN");
    const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
    const forward = '<span class="arrow" aria-hidden="true">→</span>';
    function lab() {
        return `<section class="lab" id="inline-lab" tabindex="-1" aria-label="阅读时长试算">
      <div class="editor"><div class="lab-top"><h4>样本文字</h4><span>可直接编辑</span></div>
      <label class="sr-only" for="sample-text">编辑试算文字</label><textarea spellcheck="false" id="sample-text">${escapeText(sampleText)}</textarea>
      <div class="presets" role="group" aria-label="切换试算样本">${presets.map((p) => `<button type="button" data-preset="${p.id}" aria-pressed="${sampleId === p.id}">${p.label}</button>`).join("")}</div>
      </div><div class="result"><div class="dial" aria-hidden="true"><div class="dial-center"><span>预计阅读</span><div><b data-minute>0</b><em>分钟</em></div></div></div>
      <div class="legend"><div><i class="swatch cjk"></i><span>中日韩文字</span><b data-cjk>0</b><small>字</small></div>
      <div><i class="swatch word"></i><span>其他词</span><b data-words>0</b><small>词</small></div><p>环上比例按预计用时折算</p></div>
      <output class="sr-only" id="spoken-result" aria-live="polite"></output></div></section>`;
    }
    function updateReadout() {
        const root = document.querySelector(".lab");
        if (!root)
            return;
        const { cjkCharacters, otherWords, minutes } = statistics(sampleText);
        const units = 2 * cjkCharacters + 5 * otherWords;
        const ratio = units ? (100 * 2 * cjkCharacters) / units : 0;
        const dial = root.querySelector(".dial");
        dial.style.setProperty("--split", ratio + "%");
        dial.classList.toggle("empty", units === 0);
        root.querySelector("[data-minute]").textContent = format.format(minutes);
        root.querySelector("[data-cjk]").textContent =
            format.format(cjkCharacters);
        root.querySelector("[data-words]").textContent = format.format(otherWords);
        root.querySelector("output").textContent =
            `预计阅读 ${minutes} 分钟，中日韩文字 ${cjkCharacters} 字，其他词 ${otherWords} 词。`;
        root
            .querySelectorAll("[data-preset]")
            .forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.preset === sampleId)));
    }
    function mountLab() {
        const input = document.querySelector("#sample-text");
        if (!input)
            return;
        input.value = sampleText;
        input.addEventListener("input", () => {
            sampleText = input.value;
            sampleId = "";
            updateReadout();
        });
        document
            .querySelectorAll("[data-preset]")
            .forEach((button) => button.addEventListener("click", () => {
            const preset = presets.find((p) => p.id === button.dataset.preset);
            if (!preset)
                return;
            sampleId = preset.id;
            sampleText = preset.value;
            input.value = sampleText;
            input.scrollTop = 0;
            updateReadout();
        }));
        updateReadout();
    }
    const linkToDrawing = "#project?at=user-content-首页交互工作台";
    const mark = '<svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M7 7h6l-3 9h6l3-9h6l-6 18h-6l2-6H9l-2 6H1L7 7Z" fill="currentColor"/><path d="M25.5 19H31l-2 6h-5.5l2-6Z" fill="currentColor" opacity=".62"/></svg>';
    const external = 'target="_blank" rel="noopener noreferrer"';
    const back = (fallback) => `<a class="back" href="#${fallback}" data-return><span aria-hidden="true">←</span> 返回</a>`;
    const phases = [
        {
            label: "桌体",
            image: "studio-drawing-start.webp",
            caption: "先定墙面、地面与桌子的透视线。",
        },
        {
            label: "设备",
            image: "studio-drawing-mid.webp",
            caption: "椅子、挂板与抽屉就位，铅笔开始描画笔记本。",
        },
        {
            label: "完成",
            image: BlogContent.cover,
            caption: "显示器、工具、书和绿植补齐，工作台可以开始交互。",
        },
    ];
    const topics = [...new Set(posts.flatMap((p) => p.tags))];
    let topic = "";
    let stage = 0;
    function header(route) {
        const group = route === "project"
            ? "projects"
            : route.startsWith("post/")
                ? "posts"
                : route;
        return `<header class="mast"><div class="wrap mast-inner"><a class="brand" href="#home" aria-label="Hashflow 的数字工作室首页">${mark}<span>Hashflow</span></a>
      <nav aria-label="主导航">${nav.map(([id, title]) => `<a href="#${id}" ${group === id ? 'aria-current="page"' : ""}>${title}</a>`).join("")}</nav>
      <a class="compare" href="index.html">比较方案 ${arrow}</a></div></header>`;
    }
    function footer() {
        return `<footer><div class="wrap footer-inner"><a href="#home" class="brand">${mark}<span>Hashflow</span></a><span>数字工作室</span><a href="#about">关于与联系 ${forward}</a></div></footer>`;
    }
    function metaDate(post) {
        return `<time datetime="${post.date}">${post.date.replaceAll("-", ".")}</time>`;
    }
    function articleCard(post) {
        return `<a class="writing-card" href="#post/${post.slug}">
      <div class="metadata"><span class="topic-label">${escapeText(post.tags[0])}</span>${metaDate(post)}</div>
      <h3>${escapeText(post.title)} ${forward}</h3><p>${escapeText(post.summary)}</p></a>`;
    }
    function screen(eager = true) {
        return `<div class="screen-stage"><div class="screen"><div class="browser-bar" aria-hidden="true"><i></i><i></i><i></i><span>hashflowsy.github.io/blog</span></div>
      <img src="${BlogContent.screenshot}" width="1440" height="764" alt="Personal Blog 的实际首页，左侧是作者介绍，右侧是手绘工作台" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}></div></div>`;
    }
    function home() {
        return `<section class="wrap hero" aria-labelledby="main-content"><div class="hero-copy">
      <p class="eyebrow">个人数字工作室</p><h1 id="main-content">Hashflow<span class="type-stop">.</span></h1>
      <h2>AI 全栈工程师</h2><p class="intro-text">我做 AI 应用和后端系统，写 Codex 桌宠实践，也写 AI 服务的计费风险。</p>
      <a class="pill" href="#about">关于我 ${forward}</a></div>
      <a class="featured" href="#project">${screen()}<div class="featured-caption"><div><span class="eyebrow">代表项目 · 中文技术博客与作品集</span><h2>Personal Blog</h2></div><span class="round" aria-hidden="true">↗</span></div></a></section>
      <section class="home-writing"><div class="wrap"><div class="section-head"><h2>近期写作</h2><a href="#posts">全部文章 ${forward}</a></div>
      <div class="writing-pair">${posts.map(articleCard).join("")}</div></div></section>`;
    }
    function projects() {
        return `<div class="wrap directory"><div class="page-head"><p class="eyebrow">Hashflow 的作品</p><h1 id="main-content">项目</h1></div>
      <section class="project-shelf"><a href="#project" aria-label="查看 Personal Blog 项目案例">${screen()}</a>
      <div class="project-info"><p class="eyebrow">网站设计与开发 · 2026.04 至今</p><h2>${escapeText(project.title)}</h2>
      <p>${escapeText(project.summary)}</p><div class="project-links"><a class="pill" href="#project">查看项目 ${forward}</a><a class="under" href="${linkToDrawing}">看工作台怎么画</a></div></div></section></div>`;
    }
    const toc = '<details class="contents"><summary>本页目录</summary><nav aria-label="本页目录"></nav></details>';
    function reading(html, end) {
        return `<section class="reading-sheet"><div class="wrap reading-layout"><aside>${toc}</aside><div class="reading-column"><article class="prose">${html}</article>${end}</div></div></section>`;
    }
    function projectPage() {
        return (`<header class="wrap case-head">${back("projects")}<div class="case-lead"><div><p class="eyebrow">项目案例 · 2026.04 至今</p><h1 id="main-content">Personal Blog</h1>
      <p class="subhead">${escapeText(project.result)}</p><p class="role">${escapeText(project.role)}。</p></div><div class="case-actions"><a class="pill" href="${escapeText(project.demo)}" ${external}>访问上线站点 ${arrow}</a><a class="under" href="${escapeText(project.source)}" ${external}>GitHub 源码 ${arrow}</a></div></div>
      <div class="quick-links"><span>直接看</span><a href="${linkToDrawing}">工作台绘制 ↓</a><a href="${linkToMethod}">阅读时间算法 ↓</a><a href="#project?at=user-content-构建与发布">构建与发布 ↓</a></div></header>` +
            reading(project.html, `<div class="reading-footer">${back("projects")}<a href="#posts">浏览文章 ${forward}</a></div>`));
    }
    function archiveRows(selected, needle) {
        if (!selected.length)
            return '<p class="empty">没有找到相关文章。可以换个词，或清除筛选。</p>';
        return selected
            .map((p) => {
            let summary = escapeText(p.summary);
            if (needle) {
                const body = normalize(articleTexts.get(p.slug) || "");
                const match = body.toLowerCase().indexOf(needle);
                if (match >= 0) {
                    const begin = Math.max(0, match - 27), end = Math.min(body.length, match + needle.length + 43);
                    summary =
                        (begin ? "…" : "") +
                            escapeText(body.slice(begin, match)) +
                            "<mark>" +
                            escapeText(body.slice(match, match + needle.length)) +
                            "</mark>" +
                            escapeText(body.slice(match + needle.length, end)) +
                            (end < body.length ? "…" : "");
                }
            }
            const stats = statistics(articleTexts.get(p.slug) || "");
            return `<a class="archive-row" href="#post/${p.slug}"><div class="metadata">${metaDate(p)}<span>约 ${stats.minutes} 分钟</span></div>
      <div><h2>${escapeText(p.title)}</h2><p>${summary}</p><small>${p.tags.map(escapeText).join(" / ")}</small></div><span class="round" aria-hidden="true">↗</span></a>`;
        })
            .join("");
    }
    function archive() {
        return `<div class="wrap directory"><div class="page-head"><p class="eyebrow">Hashflow 的写作</p><h1 id="main-content">技术手记</h1><p class="subhead">AI 工具实践、使用判断与工程复盘。</p></div>
    <section class="archive"><div class="search-line"><label for="archive-query">搜索文章</label><input type="search" id="archive-query" placeholder="标题、标签或正文关键词"></div>
    <div class="filters" aria-label="按主题筛选"><button type="button" data-topic="">全部</button>${topics.map((t) => `<button type="button" data-topic="${escapeText(t)}">${escapeText(t)}</button>`).join("")}</div>
    <p class="hit-count" role="status"></p><div class="rows"></div></section></div>`;
    }
    function postPage(slug) {
        const post = posts.find((p) => p.slug === slug);
        if (!post)
            return archive();
        const other = posts.find((p) => p.slug !== slug);
        const stats = statistics(articleTexts.get(slug) || "");
        return (`<header class="wrap post-head">${back("posts")}<div class="metadata"><span class="topic-label">${post.tags.map(escapeText).join(" / ")}</span>${metaDate(post)}<span>约 ${stats.minutes} 分钟</span></div>
      <h1 id="main-content">${escapeText(post.title).replace("：", '：<wbr><span class="subtitle-start"></span>')}</h1><p class="subhead">${escapeText(post.summary)}</p></header>` +
            reading(post.html, `<div class="article-note"><a href="${linkToLab}" data-load-post="${slug}">用本文试算阅读时长 ${forward}</a></div><div class="reading-footer">${back("posts")}${other ? `<a href="#post/${other.slug}">继续阅读<span>${escapeText(other.title)} ${forward}</span></a>` : ""}</div>`));
    }
    function about() {
        return `<div class="wrap directory about"><header class="page-head"><p class="eyebrow">作者与联系</p><h1 id="main-content">关于 Hashflow<span class="type-stop">.</span></h1></header>
      <section class="about-grid"><div class="profile"><h2>AI 全栈工程师</h2><p>我主要关注 AI 应用、后端系统和自动化工具。先确认问题和约束，再把方案推进到可以使用、验证和维护的状态。</p><a class="pill" href="https://github.com/HashFlowSY" ${external}>GitHub 主页 ${arrow}</a></div>
      <div class="bio"><h2>工程经历</h2><ol><li><time>2025.03 — 至今</time><h3>AI 驱动全栈工程</h3><p>从需求、架构到前后端实现，推进 AI 应用和内部工具落地。</p></li><li><time>2022.06 — 2025.03</time><h3>Java 后端开发</h3><p>负责需求评审、接口实现与灰度发布，持续优化代码和 SQL 性能。</p></li><li><time>持续进行</time><h3>工程写作与工具实践</h3><p>把项目中的判断、流程和踩坑整理成技术记录。</p></li></ol>
      <h2>联系</h2><p>目前开放全职机会与项目合作。</p><a class="under" href="https://github.com/HashFlowSY" ${external}>在 GitHub 找到我 ${arrow}</a></div></section></div>`;
    }
    function installCase() {
        document
            .getElementById("user-content-cjk-阅读时间")
            ?.nextElementSibling?.insertAdjacentHTML("afterend", `<details class="experiment"><summary>用一段文字试算阅读时长</summary>${lab()}</details>`);
        const original = document
            .querySelector('.prose img[src="assets/workbench.webp"]')
            ?.closest("p");
        if (!original)
            return;
        const figure = document.createElement("figure");
        figure.className = "process";
        figure.innerHTML = `<div class="phase-visual"><a class="stage-link"><img width="900" height="682" loading="lazy"></a></div>
      <figcaption><strong>工作台绘制过程</strong><div role="group" aria-label="查看绘制阶段">${phases.map((p, i) => `<button type="button" data-phase="${i}">${p.label}</button>`).join("")}</div><p class="phase-caption" aria-live="polite"></p></figcaption>`;
        original.replaceWith(figure);
        function select(index) {
            const item = phases[index];
            stage = index;
            const image = figure.querySelector("img");
            image.src = item.image;
            image.alt = item.caption;
            figure.querySelector("a").href = item.image;
            figure.querySelector(".phase-caption").textContent = item.caption;
            figure
                .querySelectorAll("[data-phase]")
                .forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
        }
        figure
            .querySelectorAll("[data-phase]")
            .forEach((button, i) => button.addEventListener("click", () => select(i)));
        select(stage);
    }
    function mountArchive() {
        const search = document.querySelector("#archive-query");
        if (!search)
            return;
        const buttons = document.querySelectorAll("[data-topic]");
        search.value = query;
        function filter() {
            if (!search)
                return;
            query = search.value;
            const needle = normalize(query).toLowerCase();
            const selected = posts.filter((p) => (!topic || p.tags.includes(topic)) &&
                [
                    p.title,
                    p.summary,
                    ...p.tags,
                    normalize(articleTexts.get(p.slug) || ""),
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(needle));
            buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.topic === topic)));
            document.querySelector(".rows").innerHTML = archiveRows(selected, needle);
            document.querySelector(".hit-count").textContent =
                `${selected.length} 篇文章`;
        }
        buttons.forEach((b) => b.addEventListener("click", () => {
            topic = b.dataset.topic || "";
            filter();
        }));
        search.addEventListener("input", filter);
        filter();
    }
    let mediaCleanup;
    function afterRender(route) {
        mediaCleanup?.();
        mediaCleanup = undefined;
        const content = document.querySelector(".prose");
        if (route === "project")
            installCase();
        const nav = document.querySelector(".contents nav");
        if (content && nav) {
            content.querySelectorAll("h2[id],h3[id]").forEach((h) => {
                const a = document.createElement("a");
                a.href = "#" + h.id;
                a.textContent = h.textContent;
                if (h.tagName === "H3")
                    a.className = "nested";
                nav.append(a);
            });
            const details = document.querySelector(".contents");
            const layout = matchMedia("(min-width: 900px)");
            const adjust = () => {
                details.open = layout.matches;
            };
            adjust();
            layout.addEventListener("change", adjust);
            mediaCleanup = () => layout.removeEventListener("change", adjust);
            content.querySelectorAll("table").forEach((table) => {
                const scroller = document.createElement("div");
                scroller.className = "table-scroll";
                scroller.tabIndex = 0;
                scroller.setAttribute("role", "region");
                scroller.setAttribute("aria-label", "可横向滚动的表格");
                table.before(scroller);
                scroller.append(table);
            });
            content
                .querySelectorAll("[data-search]")
                .forEach((a) => a.addEventListener("click", () => {
                topic = "";
            }));
        }
        document
            .querySelectorAll("[data-load-post]")
            .forEach((a) => a.addEventListener("click", () => {
            const preset = presets.find((p) => p.id === a.dataset.loadPost);
            if (preset) {
                sampleId = preset.id;
                sampleText = preset.value;
            }
        }));
        mountArchive();
        mountLab();
        const title = document.querySelector("h1")?.textContent?.replace(/\.$/, "");
        document.title =
            route === "home" ? "Hashflow · 数字工作室" : title + " · Hashflow";
    }
    BlogPreview.start({
        render(route) {
            const body = route === "projects"
                ? projects()
                : route === "project"
                    ? projectPage()
                    : route === "posts"
                        ? archive()
                        : route.startsWith("post/")
                            ? postPage(route.slice(5))
                            : route === "about"
                                ? about()
                                : home();
            return header(route) + body + footer();
        },
        afterRender,
    });
})();
