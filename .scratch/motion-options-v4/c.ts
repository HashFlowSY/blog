interface NotebookPost { slug: string; title: string; summary: string; date: string; tags: string[]; html: string }
interface NotebookProject { title: string; summary: string; result: string; role: string; tags: string[]; html: string }
declare const BlogContent: { posts: NotebookPost[]; project: NotebookProject; cover: string; screenshot: string };
declare const BlogPreview: { start(options: {render(route: string): string; afterRender(route: string): void}): void };

(() => {
  const { posts, project } = BlogContent;
  const linkToMethod = "#project?at=user-content-cjk-阅读时间";
  const linkToLab = "#home?at=reading-lab";
  const nav = [["home","首页"],["projects","项目"],["posts","文章"],["about","关于"]];
  const escapeText = (text: string) => text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const normalize = (text: string) => text.trim().replace(/\s+/gu," ");
  const letters = /[\p{Letter}\p{Letter_Number}]/u;
  const eastAsian = /[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Hangul}\p{Script_Extensions=Bopomofo}]/u;
  const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });

  // Same plain-prose counting and single final rounding as src/lib/markdown/analyze.ts.
  function statistics(text: string) {
    let cjkCharacters = 0;
    let otherWords = 0;
    const remaining = Array.from(normalize(text).normalize("NFC"), character => {
      if (letters.test(character) && eastAsian.test(character)) {
        cjkCharacters++;
        return " ";
      }
      return character;
    }).join("");
    for (const segment of segmenter.segment(remaining)) if (segment.isWordLike) otherWords++;
    return { cjkCharacters, otherWords, minutes: Math.ceil((2*cjkCharacters + 5*otherWords) / 1000) };
  }

  function proseText(html: string) {
    const doc = new DOMParser().parseFromString(html,"text/html");
    const blocks: string[] = [];
    let fragments = "";
    const flush = () => {
      const text = normalize(fragments);
      if (text) blocks.push(text);
      fragments = "";
    };
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) { fragments += node.textContent ?? ""; return; }
      if (!(node instanceof Element) || node.matches("[data-footnote-ref],[data-footnote-backref],.sr-only")) return;
      if (node.matches("pre")) { flush(); return; }
      if (node.matches("br")) { fragments += " "; return; }
      const boundary = node.matches("h1,h2,h3,h4,h5,h6,p,li,ul,ol,blockquote,table,tr,section,hr");
      if (boundary) flush();
      node.childNodes.forEach(walk);
      if (boundary) flush();
      if (node.matches("th,td")) fragments += " ";
    };
    walk(doc.body);
    flush();
    return blocks.join("\n");
  }

  const articleTexts = new Map(posts.map(post => [post.slug,proseText(post.html)]));
  const pet = posts.find(post=>post.slug==="2026-05-02")!;
  const glossary = posts.find(post=>post.slug==="2026-04-30")!;
  const presets = [
    {id:"mixed",label:"中英混排",value:"用 Markdown 写下实践，把想法交给代码验证。\n\nKeep a small notebook. Build a prototype, test it, then write down what changed."},
    {id:pet.slug,label:"桌宠原文",value:articleTexts.get(pet.slug)!},
    {id:glossary.slug,label:"术语原文",value:articleTexts.get(glossary.slug)!}
  ];
  let sampleId = presets[0].id;
  let sampleText = presets[0].value;
  let query = "";
  const format = new Intl.NumberFormat("zh-CN");
  const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
  const forward = '<span class="arrow" aria-hidden="true">→</span>';

  function header(route: string) {
    const active = route === "project" ? "projects" : route.startsWith("post/") ? "posts" : route;
    return `<header class="top"><div class="wrap mast"><a class="brand" href="#home" aria-label="Hashflow 工程实验簿首页"><i class="mark" aria-hidden="true"><b></b><b></b><b></b></i>Hashflow<span>工程实验簿</span></a>
      <nav aria-label="主导航">${nav.map(([id,title])=>`<a href="#${id}" ${active===id?'aria-current="page"':""}>${title}</a>`).join("")}</nav>
      <a class="compare" href="index.html">比较方案 ${arrow}</a></div></header>`;
  }
  function footer() {
    return `<footer><div class="wrap"><strong>Hashflow</strong><span>AI 全栈工程师</span><a href="#about">作者与联系 ${arrow}</a></div></footer>`;
  }
  function lab(inProject=false) {
    const heading = inProject ? "h4" : "h2";
    return `<section class="lab" id="${inProject?'inline-lab':'reading-lab'}" tabindex="-1" aria-label="阅读时长试算">
      <div class="editor"><div class="lab-top"><${heading}>样本文字</${heading}><span>可直接编辑</span></div>
      <label class="sr-only" for="sample-text">编辑试算文字</label><textarea spellcheck="false" id="sample-text">${escapeText(sampleText)}</textarea>
      <div class="presets" role="group" aria-label="切换试算样本">${presets.map(p=>`<button type="button" data-preset="${p.id}" aria-pressed="${sampleId===p.id}">${p.label}</button>`).join("")}</div>
      </div><div class="result"><div class="dial" aria-hidden="true"><div class="dial-center"><span>预计阅读</span><div><b data-minute>0</b><em>分钟</em></div></div></div>
      <div class="legend"><div><i class="swatch cjk"></i><span>中日韩文字</span><b data-cjk>0</b><small>字</small></div>
      <div><i class="swatch word"></i><span>其他词</span><b data-words>0</b><small>词</small></div><p>环上比例按预计用时折算</p></div>
      <output class="sr-only" id="spoken-result" aria-live="polite"></output></div></section>`;
  }
  function postRows(rows: NotebookPost[],level="h2") {
    return rows.map(post => `<a class="post-row" href="#post/${post.slug}"><div class="post-meta"><time datetime="${post.date}">${post.date.replaceAll("-",".")}</time><span>${escapeText(post.tags[0] || "")}</span></div>
      <div><${level}>${escapeText(post.title)}</${level}><p>${escapeText(post.summary)}</p></div>${forward}</a>`).join("");
  }
  function home() {
    return `<div class="wrap"><section class="home-intro"><div class="source-line"><i></i>Hashflow 的工程博客 · 项目实验</div>
      <h1>这段文字，要读<span>多久？</span></h1><p>这是我在 <a href="#project">Personal Blog</a> 里使用的阅读时间算法。改写样本，看看结果如何变化。</p></section>
      ${lab()}<div class="lab-foot"><span>每分钟 500 个中日韩文字或 200 个其他词，加总后向上取整。</span><a href="${linkToMethod}">读算法实现 ${forward}</a></div>
      <section class="home-writing"><div class="section-title"><h2>近期手记</h2><a href="#posts">全部文章 ${forward}</a></div>
      ${postRows(posts,"h3")}</section><section class="author-end"><h2>我是 Hashflow，<span>AI 全栈工程师。</span></h2>
      <p>从需求拆解到上线，交付 AI 应用、后端系统和自动化工具。</p><a class="line-link" href="#about">关于与联系 ${forward}</a></section></div>`;
  }
  function intro(title: string, description: string, meta="", back="") {
    return `<section class="wrap page-intro">${back}${meta?`<p class="source-line"><i></i>${escapeText(meta)}</p>`:""}
      <h1>${escapeText(title)}</h1><p class="lede">${escapeText(description)}</p></section>`;
  }
  function projects() {
    return intro("项目与实验","试一项真实功能，或阅读它在项目中的实现。") +
      `<section class="wrap project-entry"><div><p class="source-line"><i></i>网站设计与开发 · 2026.04 至今</p>
      <h2>${escapeText(project.title)}</h2><p>${escapeText(project.result)}</p><div class="link-pair">
      <a class="button" href="#project">读项目记录 ${forward}</a><a class="line-link" href="${linkToLab}">试算阅读时长 ${arrow}</a></div></div>
      <div class="specimen"><span>阅读时间算法</span><div><b>500</b><small>字 / 分</small></div><div><b>200</b><small>词 / 分</small></div></div></section>`;
  }
  function reading(html:string) {
    return `<div class="wrap reading"><nav class="toc" aria-label="章节目录"><b>本页目录</b></nav><article class="prose">${html}</article></div>`;
  }
  const backLink=(target:string)=>`<a class="back" data-return href="#${target}">← 返回浏览</a>`;
  function projectPage() {
    return intro(project.title,project.result,"项目记录 · 设计、开发与维护",backLink("projects"))+
      `<div class="wrap method-link"><a href="${linkToMethod}">跳至阅读时间算法 ↓</a><span>${escapeText(project.tags.slice(0,4).join(" / "))}</span></div>`+
      reading(project.html)+`<div class="wrap reading-end">${backLink("projects")}<a href="#posts">浏览文章 ${forward}</a></div>`;
  }
  function archive() {
    return intro("技术手记","记录 AI 工具实践和使用中的判断。")+
      `<section class="wrap archive"><div class="archive-tools"><label for="archive-query">全文搜索</label><input type="search" id="archive-query" placeholder="标题、标签或正文关键词">
      <span class="hit-count" role="status"></span></div><div class="rows"></div></section>`;
  }
  function postPage(id:string) {
    const post=posts.find(p=>p.slug===id);
    if(!post)return archive();
    const other=posts.find(p=>p.slug!==id);
    const st=statistics(articleTexts.get(id) || "");
    return intro(post.title,post.summary,[post.date,post.tags[0],`约 ${st.minutes} 分钟`].join(" · "),backLink("posts"))+
      reading(post.html)+`<div class="wrap article-test"><p>本文的阅读时间约为 ${st.minutes} 分钟。</p><a href="${linkToLab}" data-load-post="${id}">拿本文试算 ${forward}</a></div>
      <div class="wrap reading-end">${backLink("posts")}${other?`<a href="#post/${other.slug}">${escapeText(other.title)} ${forward}</a>`:""}</div>`;
  }
  function about() {
    return intro("关于 Hashflow","从需求澄清到上线，把复杂问题拆成可执行、可验证的系统。","AI 全栈工程师")+
      `<div class="wrap about"><section><h2>工程经历</h2><ol><li><time>2025.03 — 至今</time><div><h3>AI 驱动全栈工程</h3><p>从需求、架构到前后端实现，推进 AI 应用和内部工具落地。</p></div></li>
      <li><time>2022.06 — 2025.03</time><div><h3>Java 后端开发</h3><p>负责需求评审、接口实现与灰度发布，持续优化代码和 SQL 性能。</p></div></li>
      <li><time>持续进行</time><div><h3>工程写作与工具实践</h3><p>把项目中的判断、流程和踩坑整理成技术记录。</p></div></li></ol></section>
      <section class="about-side"><h2>能力范围</h2><p>AI 应用与 Agent、后端系统、全栈交付、工程效率。</p><h2>联系</h2><p>目前开放全职机会与项目合作。</p><a class="line-link" href="https://github.com/HashFlowSY" target="_blank" rel="noopener noreferrer">GitHub 主页 ${arrow}</a></section></div>`;
  }

  function updateReadout() {
    const root=document.querySelector<HTMLElement>(".lab");
    if(!root)return;
    const {cjkCharacters, otherWords, minutes}=statistics(sampleText);
    const units=2*cjkCharacters+5*otherWords;
    const ratio=units?100*2*cjkCharacters/units:0;
    const dial=root.querySelector<HTMLElement>(".dial")!;
    dial.style.setProperty("--split", ratio+"%");
    dial.classList.toggle("empty",units===0);
    root.querySelector("[data-minute]")!.textContent=format.format(minutes);
    root.querySelector("[data-cjk]")!.textContent=format.format(cjkCharacters);
    root.querySelector("[data-words]")!.textContent=format.format(otherWords);
    root.querySelector("output")!.textContent=`预计阅读 ${minutes} 分钟，中日韩文字 ${cjkCharacters} 字，其他词 ${otherWords} 词。`;
    root.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.preset===sampleId)));
  }
  function mountLab() {
    const input=document.querySelector<HTMLTextAreaElement>("#sample-text");
    if(!input)return;
    input.value=sampleText;
    input.addEventListener("input",()=>{sampleText=input.value;sampleId="";updateReadout();});
    document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach(button=>button.addEventListener("click",()=>{
      const preset=presets.find(p=>p.id===button.dataset.preset);
      if(!preset)return;
      sampleId=preset.id;sampleText=preset.value;input.value=sampleText;input.scrollTop=0;updateReadout();
    }));
    updateReadout();
  }
  function afterRender(route:string) {
    const content=document.querySelector(".prose");
    if (route==="project" && content) {
      const anchor=content.querySelector("#user-content-cjk-阅读时间");
      const text=anchor?.nextElementSibling;
      text?.insertAdjacentHTML("afterend",`<details class="inline-experiment"><summary>打开试算 · 用自己的文字验证</summary>${lab(true)}</details>`);
    }
    const toc=document.querySelector(".toc");
    if(toc && content){
      const headings=Array.from(content.querySelectorAll<HTMLElement>("h2,h3[id]"));
      headings.forEach(heading=>{
        if(!heading.id)return;
        const link=document.createElement("a");
        link.href="#"+heading.id;
        link.textContent=heading.textContent;
        if(heading.tagName==="H3")link.className="nested";
        toc.append(link);
      });
    }
    document.querySelectorAll<HTMLAnchorElement>("[data-load-post]").forEach(link=>link.addEventListener("click",()=>{
      const preset=presets.find(p=>p.id===link.dataset.loadPost);
      if(preset){sampleText=preset.value;sampleId=preset.id;}
    }));
    const search=document.querySelector<HTMLInputElement>("#archive-query");
    if(search){
      search.value=query;
      const filter=()=>{
        query=search.value;
        const needle=normalize(query).toLowerCase();
        const filtered=posts.filter(p=>[p.title,p.summary,...p.tags,articleTexts.get(p.slug)].join(" ").toLowerCase().includes(needle));
        document.querySelector(".rows")!.innerHTML=postRows(filtered);
        document.querySelector(".hit-count")!.textContent=filtered.length?`${filtered.length} 篇文章`:"没有匹配的文章";
      };
      filter();search.addEventListener("input",filter);
    }
    mountLab();
  }
  BlogPreview.start({
    render(route) {
      const body=route==="projects"?projects():route==="project"?projectPage():
        route==="posts"?archive():route.startsWith("post/")?postPage(route.slice(5)):route==="about"?about():home();
      return header(route)+body+footer();
    },afterRender,
  });
})();
