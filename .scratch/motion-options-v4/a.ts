(() => {
  interface Post {
    slug: string;
    title: string;
    date: string;
    tags: string[];
    summary: string;
    html: string;
  }
  interface Project {
    title: string;
    summary: string;
    result: string;
    role: string;
    tags: string[];
    html: string;
  }
  interface PreviewWindow extends Window {
    BlogContent: { posts: Post[]; project: Project; cover: string; screenshot: string };
    BlogPreview: { start: (options: { render(route: string): string; afterRender(route: string): void }) => void };
  }
  const { BlogContent: { posts, project, cover, screenshot }, BlogPreview } = window as unknown as PreviewWindow;
  const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
  const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
  function backTo(fallback: "projects" | "posts") {
    const from: string = history.state?.from || fallback;
    const labels: Record<string, string> = { home: "首页", projects: "项目列表", posts: "文章列表", project: "项目详情", about: "关于" };
    return `<a class="back" data-return href="#${fallback}">← 返回${labels[from] ?? "上一篇文章"}</a>`;
  }
  type Artwork = "workbench" | "screen";
  let artwork: Artwork = "workbench";
  const selectedArtwork = new Map<number, Artwork>();
  const media = (shared = true, subject: Artwork = "workbench") => {
    const screen = subject === "screen";
    return `<figure class="artboard ${shared ? 'shared-cover' : ''}"><img src="${screen ? screenshot : cover}" alt="${screen ? 'Personal Blog 首页界面预览' : '手绘工作台，桌上有显示器和笔记本，右下方是黄色抽屉'}" width="${screen ? 1440 : 900}" height="${screen ? 764 : 682}"></figure>`;
  };
  const count = (n: number) => String(n).padStart(2, "0");
  const date = (iso: string) => escape(iso.replaceAll("-", "."));
  const band = (title: string, english: string, link: string, action: string) =>
    `<header class="band"><h2>${title}<em lang="en">${english}</em></h2><a href="#${link}">${action} ${arrow}</a></header>`;
  const entry = (post: Post, extra = "") => `<a class="entry" href="#post/${post.slug}">
    <span><span class="meta">${date(post.date)} · ${escape(post.tags[0])}</span>
    <strong>${escape(post.title)}</strong>${extra}</span>${arrow}</a>`;
  function home() {
    return `<section class="hero"><div><p class="role">AI 全栈工程师</p>
      <h1 lang="en">Hashflow<span aria-hidden="true">.</span></h1>
      <p class="lede">从需求拆解到上线，交付 AI 应用、后端系统和自动化工具。</p>
      <p class="availability">4 年以上工程经验 · 欢迎聊全职机会和项目合作</p>
      <div class="actions"><a class="action" href="#projects">浏览项目 ${arrow}</a>
      <a class="textlink" href="#posts">读文章 <span aria-hidden="true">→</span></a></div></div>
      <a class="artlink" data-art="workbench" href="#project" aria-label="查看 Personal Blog 项目详情">${media(artwork === "workbench")}
      <div class="caption"><span><i lang="en">Fig. 1</i> 首页手绘工作台</span><span>打开项目 ${arrow}</span></div></a>
    </section>
    <div class="home-index"><section>${band("代表项目", "Project", "projects", "项目列表")}
      <a class="home-project" data-art="screen" href="#project"><img class="thumb ${artwork === "screen" ? "shared-cover" : ""}" width="1440" height="764" src="${screenshot}" alt="Personal Blog 首页预览">
      <div><p class="meta">2026.04 — 至今</p><h3 class="${artwork === "screen" ? "shared-title" : ""}">${escape(project.title)}</h3><p class="desc">中文技术博客与作品集</p></div></a>
    </section><section>${band("最新文章", "Writing", "posts", "文章归档")}
      <div>${posts.map((post) => entry(post)).join("")}</div></section></div>`;
  }
  const indexHead = (name: string, title: string, description: string, total: string) =>
    `<div class="section-head"><div><p class="role" lang="en">${name}</p><h1>${title}</h1><p>${description}</p></div><span class="folio-number" aria-label="${total} 项">${total}</span></div>`;
  function projects() {
    return `${indexHead("Selected project", "项目作品", "我做过的项目、承担的角色，以及可以查证的结果。", "01")}
      <a class="project-card" data-art="${artwork}" href="#project">${media(true, artwork)}<div>
        <p class="meta">2026.04 — 至今 · 已上线</p><h2 class="shared-title" lang="en">${escape(project.title)}</h2>
        <p class="desc">${escape(project.result)}</p><span class="textlink">打开项目 ${arrow}</span></div></a>`;
  }
  function projectDetail() {
    return `${backTo("projects")}
      <section class="project-head"><div><p class="role">项目案例</p>
        <h1 class="shared-title" lang="en">${escape(project.title)}</h1>
        <p class="result">${escape(project.result)}</p><p class="byline">我的角色 · ${escape(project.role)}</p></div>
        <div>${media(true, artwork)}<div class="caption"><span><i lang="en">Fig. 1</i> ${artwork === "screen" ? "Personal Blog 首页界面" : "首页手绘工作台"}</span></div></div></section>
      <div class="project-body"><nav class="chapters" aria-label="项目章节"><span class="meta">项目目录</span></nav>
        <article class="prose" id="project-prose">${project.html}</article></div>`;
  }
  const tags = Array.from(new Set(posts.flatMap((p) => p.tags)));
  let searchText = "";
  let activeTag = "";
  const plainBody = (post: Post) => new DOMParser().parseFromString(post.html, "text/html").body.textContent ?? "";
  const bodies = new Map(posts.map(post => [post.slug, plainBody(post)]));
  function searchRows() {
    const term = searchText.trim().toLocaleLowerCase();
    const filtered = posts.filter((p) => (!activeTag || p.tags.includes(activeTag)) &&
      [p.title, p.summary, ...p.tags, bodies.get(p.slug) ?? ""].join(" ").toLocaleLowerCase().includes(term));
    return filtered.map((post) => {
      const text = bodies.get(post.slug) ?? "";
      const index = term ? text.toLocaleLowerCase().indexOf(term) : -1;
      const summary = index >= 0 ? `…${text.slice(Math.max(0, index - 17), index + term.length + 26).replace(/\s+/g, " ")}…` : post.summary;
      return entry(post, `<span class="summary">${escape(summary)}</span>`);
    }).join("") || '<p class="subtle">没有匹配的文章。可以更换关键词或选择其他主题。</p>';
  }
  function archive() {
    return `${indexHead("Writing archive", "文章归档", "记录 AI 工具实践、工程判断和使用中的问题。", count(posts.length))}
      <div class="archive-tools"><label class="query">全文检索 <input type="search" value="${escape(searchText)}" placeholder="搜索标题或正文"></label>
      <div class="tags" aria-label="文章主题">${["", ...tags].map((tag) =>
        `<button type="button" data-tag="${escape(tag)}" aria-pressed="${tag === activeTag}">${escape(tag || "全部")}</button>`).join("")}</div></div>
      <div class="archive-list" aria-live="polite">${searchRows()}</div>`;
  }
  function postDetail(post: Post) {
    const next = posts.find((other) => other.slug !== post.slug);
    return `<div class="progress" aria-hidden="true"></div><div class="read-shell">
      ${backTo("posts")}
      <header class="read-head"><p class="role">技术文章</p><h1>${escape(post.title)}</h1>
        <p class="subtle">${escape(post.summary)}</p><p class="meta" style="margin-top:15px">${date(post.date)} · ${post.tags.map(escape).join(" / ")}</p></header>
      <article class="prose">${post.html}</article>${next ? `<aside class="read-next"><p class="meta">继续阅读</p>${entry(next)}</aside>` : ""}</div>`;
  }
  function about() {
    return `<section class="profile"><p class="role">关于我</p><h1>工程背景，产品视角。</h1>
      <p>我是 Hashflow，AI 全栈工程师。我主要关注 AI 应用、后端系统和自动化工具，习惯先确认问题与约束，再把方案推进到可以使用、验证和维护的状态。</p>
      <p class="subtle">4 年以上工程经验 · 开放全职机会与项目合作</p></section>
      <div class="about-columns"><section><h2>能力范围</h2><dl>
        <dt>AI 应用与 Agent</dt><dd>需求拆解、提示链路、工具调用与效果评测。</dd>
        <dt>后端系统</dt><dd>Java / TypeScript、API、SQL 与性能优化。</dd>
        <dt>全栈交付</dt><dd>从 PRD 到前后端实现、测试与上线。</dd>
        <dt>工程效率</dt><dd>Linux、CI / CD、可观测性与自动化流程。</dd></dl></section>
      <section><h2>工程经历</h2><dl><dt><small>2025.03 — 至今</small>AI 驱动全栈工程</dt><dd>从需求、架构到前后端实现，推进 AI 应用和内部工具落地。</dd>
        <dt><small>2022.06 — 2025.03</small>Java 后端开发</dt><dd>负责需求评审、接口实现与灰度发布，持续优化代码和 SQL 性能。</dd>
        <dt><small>持续进行</small>工程写作与工具实践</dt><dd>把项目中的判断、流程和踩坑整理成可复用的技术记录。</dd></dl></section></div>
      <section class="contact" id="contact"><h2>求职与合作</h2><a class="textlink" href="https://github.com/HashFlowSY" target="_blank" rel="noopener noreferrer">查看 GitHub 主页 ${arrow}</a></section>`;
  }
  // Select the actual clicked cover before the router captures the old view.
  document.addEventListener("click", event => {
    if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-art]") : null;
    if (!link) return;
    artwork = link.dataset.art === "screen" ? "screen" : "workbench";
    selectedArtwork.set(history.state.key, artwork);
    const selectedHomeCard = document.querySelector(".home-project");
    if (!selectedHomeCard) return;
    selectedHomeCard.querySelector(".thumb")?.classList.toggle("shared-cover", artwork === "screen");
    selectedHomeCard.querySelector("h3")?.classList.toggle("shared-title", artwork === "screen");
    document.querySelector(".artlink .artboard")?.classList.toggle("shared-cover", artwork === "workbench");
  }, { capture: true });
  const render = (route: string) => {
    if (["home", "projects", "project"].includes(route)) {
      artwork = selectedArtwork.get(history.state.key) ?? artwork;
      selectedArtwork.set(history.state.key, artwork);
    }
    if (route === "projects") return projects();
    if (route === "project") return projectDetail();
    if (route === "posts") return archive();
    if (route === "about") return about();
    const post = posts.find((candidate) => route === `post/${candidate.slug}`);
    return post ? postDetail(post) : home();
  };
  let progress: HTMLElement | null = null;
  function updateProgress() {
    if (!progress) return;
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 1;
    progress.style.transform = `scaleX(${fraction})`;
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  function afterRender(route: string) {
    const page = route === "project" ? "projects" : route.startsWith("post/") ? "posts" : route;
    document.querySelectorAll<HTMLAnchorElement>(".masthead nav a").forEach((link) => {
      if (link.hash === `#${page}`) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    progress = document.querySelector<HTMLElement>(".progress");
    updateProgress();
    if (route === "project") {
      const chapters = document.querySelector(".chapters");
      document.querySelectorAll<HTMLElement>("#project-prose h2").forEach((heading) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = heading.textContent;
        button.addEventListener("click", () => {
          heading.focus({ preventScroll: true });
          heading.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        });
        chapters?.append(button);
      });
    }
    if (route === "posts") {
      const results = document.querySelector<HTMLElement>(".archive-list");
      const search = document.querySelector<HTMLInputElement>('.query input');
      const buttons = document.querySelectorAll<HTMLButtonElement>(".tags button");
      search?.addEventListener("input", () => {
        searchText = search.value;
        if (results) results.innerHTML = searchRows();
      });
      buttons.forEach(button => button.addEventListener("click", () => {
        activeTag = button.dataset.tag ?? "";
        buttons.forEach((choice) => choice.setAttribute("aria-pressed", String(choice === button)));
        if (results) results.innerHTML = searchRows();
      }));
    }
  }
  BlogPreview.start({ render, afterRender });
})();
