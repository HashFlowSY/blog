interface BotanicalPost {
  slug:string; title:string; date:string; tags:string[]; summary:string; html:string;
}
interface BotanicalProject {
  title:string; summary:string; result:string; role:string; tags:string[]; html:string;
}
interface BotanicalPreview {
  BlogContent:{posts:BotanicalPost[]; project:BotanicalProject; cover:string; screenshot:string};
  BlogPreview:{start(page:{render(route:string):string; afterRender(route:string):void}):void};
}
(() => {
  const {BlogContent:content,BlogPreview:preview}=window as typeof window & BotanicalPreview;
  const esc=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const date=(s:string)=>s.replaceAll("-",".");
  const categories=[["home","首页"],["projects","项目"],["posts","文章"],["about","关于"]];
  const section=(route:string)=>route==="project"?"projects":route.startsWith("post/")?"posts":route;
  const imageSource="https://commons.wikimedia.org/wiki/File:The_ferns_of_Great_Britain_and_Ireland_(Plate_XXX)_BHL273805.jpg";
  const tagLabels:Record<string,string>={nextjs:"Next.js",typescript:"TypeScript",svg:"SVG",shiki:"Shiki","github-pages":"GitHub Pages",tailwindcss:"Tailwind CSS"};
  const post=(slug:string)=>content.posts.find(entry=>entry.slug===slug)!;
  const chapter=(route:string,id:string)=>`#${route}?at=${encodeURIComponent(id)}`;
  const svgPath={
    next:"M3 10h13m-5-5 5 5-5 5", back:"M17 10H4m5-5-5 5 5 5",
    ext:"M4 16 16 4M6 4h10v10", search:"m14 14 4 4M15 9A6 6 0 1 1 3 9a6 6 0 0 1 12 0"
  };
  const icon=(name:keyof typeof svgPath,size=16)=>`<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${svgPath[name]}"/></svg>`;
  const link=(href:string,label:string,ext=false)=>`<a class="ink-link" href="${esc(href)}"${ext?' target="_blank" rel="noreferrer"':''}>${esc(label)} ${icon(ext?"ext":"next",14)}</a>`;
  const back=(route:string)=>`<a data-return class="return" href="#${route}">${icon("back",14)} 返回</a>`;
  const image=(src:string,alt:string,w:number,h:number)=>`<img src="${esc(src)}" alt="${esc(alt)}" width="${w}" height="${h}">`;
  const heading=(name:string,description:string)=>`<header class="section-lead"><h1>${esc(name)}</h1><p>${esc(description)}</p></header>`;
  const listTitle=(title:string,href:string,label:string)=>`<div class="list-title"><h2>${esc(title)}</h2>${link(href,label)}</div>`;
  const notes=[
    {slug:"2026-05-02",label:"做桌宠时，先确认什么？",heading:"基本流程",quote:"启动后给出素材或文字描述，skill 会先生成一张基础参考图；确认方向后，再继续制作动作和运行所需的资源。"},
    {slug:"2026-04-30",label:"中转站的「倍率」是什么意思？",heading:"中转站",quote:"中转站相对官方 API 价格的定价系数。倍率 1 = 同价，0.8 = 八折。"},
    {slug:"2026-04-30",label:"使用前，该核对哪些风险？",heading:"使用前的检查清单",quote:"能否说明请求实际发送到哪里，是否保留日志或训练数据。",extra:"是否明确模型来源、倍率和失败退款规则。"}
  ];
  const parse=(html:string)=>new DOMParser().parseFromString(html,"text/html");
  const blocks=content.posts.map(entry=>({
    entry,body:Array.from(parse(entry.html).querySelectorAll("p,li,th,td,h2,h3,h4")).map(el=>el.textContent?.trim()||"")
  }));
  const filters=new Map<number,{query:string;tag:string}>();
  function filterState() {
    const key=Number(history.state?.key??0);
    let value=filters.get(key);
    if(!value){value={query:"",tag:""};filters.set(key,value);}
    return value;
  }

  function mast(route:string) {
    return `<header class="site-head"><div class="width mast"><a class="brand" href="#home" aria-label="常青笔记首页"><i aria-hidden="true" class="emblem"></i>常青笔记</a>
      <nav aria-label="主导航">${categories.map(([path,name])=>`<a href="#${path}"${section(route)===path?' aria-current="location"':''}>${name}</a>`).join("")}</nav>
      <a class="compare" href="index.html">比较方案 ${icon("ext",12)}</a></div></header>`;
  }
  function foot() {
    return `<footer class="width site-foot"><div><span>常青笔记</span><a href="#about">Hashflow 的个人作品与写作</a></div><a href="${imageSource}" target="_blank" rel="noreferrer">蕨图 · Henry Bradbury，1855 ${icon("ext",10)}</a></footer>`;
  }
  function articleRow(entry:BotanicalPost,snippet=esc(entry.summary),short=false) {
    return `<a class="article-row" href="#post/${entry.slug}"><div class="row-byline"><time datetime="${entry.date}">${date(entry.date)}</time><span>${esc(entry.tags[0])}</span></div><div class="row-title"><strong>${esc(entry.title)}</strong>${icon("ext",15)}</div>${short?"":`<p>${snippet}</p>`}</a>`;
  }
  function home() {
    return `<div class="width home">
      <header class="author-lead"><div class="author-line"><h1>Hashflow</h1><span>AI 全栈工程师</span></div><div class="preface">
        <p>做 AI 应用、后端系统和自动化工具。最近写了 Codex 桌宠，也梳理了 AI 服务中转站的计费术语。</p>${link("#about","关于我")}</div><i class="edge-fern" aria-hidden="true"></i></header>
      <div class="home-columns"><section class="home-project">${listTitle("代表作品","#projects","所有项目")}
        <a class="work-plate" href="#project"><div class="plate-art">${image(content.cover,"博客首页的手绘工作台成稿",900,682)}</div><div class="plate-words"><h3>Personal Blog</h3><p>用 Markdown 写中文技术文章，也记录每个项目的实现过程。支持全文搜索与主题筛选。</p><span class="plate-link">读项目案例 ${icon("next",15)}</span></div></a></section>
        <section class="home-writing">${listTitle("近期写作","#posts","文章目录")}${content.posts.map(p=>articleRow(p)).join("")}</section></div></div>`;
  }
  function questions(items:typeof notes,title:string) {
    return `<section class="notes"><h2>${esc(title)}</h2>${items.map(q=>`<details class="question" data-notes-for="${q.slug}" data-question="${notes.indexOf(q)}"><summary><span>${esc(q.label)}</span><i aria-hidden="true" class="toggle"></i></summary>
      <div class="excerpt"><blockquote><p>${esc(q.quote)}</p>${q.extra?`<p>${esc(q.extra)}</p>`:""}</blockquote><a class="chapter ink-link" href="${chapter("post/"+q.slug,"user-content-"+q.heading)}">读原文 · ${esc(q.heading)} ${icon("next",12)}</a></div></details>`).join("")}</section>`;
  }
  function projects() {
    return `<div class="width directory projects">${heading("项目手记","从具体的作品，回看我做了什么、为什么这样做。")}
      <article class="project-feature"><a class="screen-proof" href="#project" aria-label="查看 Personal Blog 项目案例">${image(content.screenshot,"Personal Blog 首页实际界面",1440,764)}</a>
      <div class="project-record"><span class="rubric">2026 年 4 月至今</span><h2><a href="#project">Personal Blog</a></h2><p>${esc(content.project.result)}</p>
      <dl class="fact"><dt>我的角色</dt><dd>${esc(content.project.role)}</dd></dl>${link("#project","打开完整案例")}</div></article>
      <section class="quick-chapters"><h2>按实现阅读</h2>${[["文章检索","文章是怎么搜到的"],["首页交互工作台","手绘工作台怎样动起来"],["构建与发布","从 Markdown 到上线"]].map(([id,label])=>link(chapter("project","user-content-"+id),label)).join("")}</section></div>`;
  }
  function toc(route:string,html:string) {
    const items=Array.from(parse(html).querySelectorAll("h2[id]"));
    return `<nav class="toc" aria-label="章节导航">${items.map(el=>`<a href="${chapter(route,el.id)}">${esc(el.textContent||"")}</a>`).join("")}</nav>`;
  }
  function chapterNav(route:string,html:string) {
    const list=toc(route,html);
    return `<div class="chapter-nav"><h2>本篇章节</h2>${list}</div><details class="mobile-toc"><summary>本篇章节 <span aria-hidden="true">⌄</span></summary>${list}</details>`;
  }
  function project() {
    const item=content.project;
    return `<div class="width case-detail">${back("projects")}
    <header class="case-banner"><div><span class="rubric">项目案例</span><h1>Personal Blog</h1><p>${esc(item.result)}</p></div><dl><dt>我的角色</dt><dd>${esc(item.role)}</dd><dt>周期</dt><dd>2026 年 4 月至今</dd></dl></header>
    <div class="case-columns"><aside>${chapterNav("project",item.html)}<div class="case-tech"><h2>技术栈</h2><p>${item.tags.map(t=>esc(tagLabels[t]||t)).join(" / ")}</p>${link("https://github.com/HashFlowSY/blog","查看源代码",true)}</div></aside>
    <div class="case-manuscript"><figure class="case-image">${image(content.screenshot,"Personal Blog 首页，左侧作者介绍，右侧手绘工作台",1440,764)}<figcaption>Personal Blog 的首页界面</figcaption></figure>
    <article class="prose">${item.html}</article><div class="chapter-end">${link("#posts","查看站内文章")}</div></div></div></div>`;
  }
  function archive() {
    const state=filterState(), tags=Array.from(new Set(content.posts.flatMap(p=>p.tags)));
    return `<div class="width directory archive">${heading("文章目录","关于 AI 工具的使用、判断与复盘。")}
    <div class="archive-grid"><section class="archive-main"><label class="search">${icon("search",18)}<input type="search" aria-label="搜索文章" placeholder="搜索标题、主题或正文" value="${esc(state.query)}"></label>
     <div class="topics" role="group" aria-label="筛选主题">${["",...tags].map(t=>`<button type="button" data-tag="${esc(t)}" aria-pressed="${state.tag===t}">${esc(t||"全部主题")}</button>`).join("")}</div>
     <p class="result-count" aria-live="polite"></p><div id="results"></div></section><aside class="archive-margin">${questions(notes,"按问题翻阅")}</aside></div></div>`;
  }
  function article(entry:BotanicalPost) {
    const route="post/"+entry.slug;
    const remaining=content.posts.filter(p=>p!==entry);
    const study=entry.slug==="2026-05-02";
    return `<div class="width reading ${study?"process-article":"glossary-article"}">${back("posts")}
      <header class="article-head"><span class="rubric">${esc(entry.tags.join(" / "))}</span><h1>${esc(entry.title)}</h1><p>${esc(entry.summary)}</p><div class="byline"><a href="#about">Hashflow</a><span></span><time datetime="${entry.date}">${date(entry.date)}</time></div></header>
      <div class="reading-columns"><div class="reading-text"><article class="prose">${entry.html}</article>
      <div class="reading-related"><h2>接着读</h2>${remaining.map(p=>articleRow(p,esc(p.summary),true)).join("")}</div></div>
      <aside class="reading-margin">${chapterNav(route,entry.html)}${questions(notes.filter(q=>q.slug===entry.slug),"页边摘录")}</aside></div></div>`;
  }
  function about() {
    const roles=[["2025.03 至今","AI 驱动全栈工程","从需求、架构到前后端实现，推进 AI 应用和内部工具落地。"],["2022.06 — 2025.03","Java 后端开发","负责需求评审、接口实现与灰度发布，持续优化代码和 SQL 性能。"],["持续进行","工程写作与工具实践","把项目中的判断、流程和踩坑整理成可复用的技术记录。"]];
    const skills=[["AI 应用与 Agent","需求拆解、提示链路、工具调用与效果评测。"],["后端系统","Java / TypeScript、API、SQL 与性能优化。"],["全栈交付","从 PRD 到前后端实现、测试与上线。"],["工程效率","Linux、CI / CD、可观测性与自动化流程。"]];
    return `<div class="width author-page"><header class="bio"><div class="bio-name"><span class="rubric">关于作者</span><h1>Hashflow</h1><p>AI 全栈工程师</p></div><div class="bio-intro"><p>我主要关注 AI 应用、后端系统和自动化工具。做事时习惯先确认问题与约束，然后把方案推进到可以使用、验证和维护的状态。</p>
      <p>我在 <a href="#project">Personal Blog</a> 写下工具实践和项目复盘。</p></div></header>
      <div class="bio-grid"><section class="experience"><h2>工程经历</h2>${roles.map(([period,role,desc])=>`<div><time>${period}</time><section><h3>${role}</h3><p>${desc}</p></section></div>`).join("")}</section>
      <section class="skills"><h2>能力范围</h2><dl>${skills.map(([skill,desc])=>`<div><dt>${skill}</dt><dd>${desc}</dd></div>`).join("")}</dl></section></div>
      <section id="contact" class="contact"><div><h2>求职与合作</h2><p>4 年以上工程经验，目前开放全职机会与项目合作。</p></div>${link("https://github.com/HashFlowSY","GitHub 主页",true)}</section></div>`;
  }
  function render(route:string) {
    let body:string;
    if(route==="home")body=home();else if(route==="projects")body=projects();else if(route==="project")body=project();
    else if(route==="posts")body=archive();else if(route.startsWith("post/")){const entry=post(route.slice(5));body=entry?article(entry):archive();}else body=about();
    return mast(route)+body+foot();
  }
  function applyFilters() {
    const state=filterState(), term=state.query.trim().toLocaleLowerCase();
    const visible=new Set<string>();
    const rows=blocks.filter(({entry})=>!state.tag||entry.tags.includes(state.tag)).flatMap(({entry,body})=>{
      let snippet=esc(entry.summary);
      if(term&&![entry.title,entry.summary,...entry.tags].some(value=>value.toLocaleLowerCase().includes(term))){
        const hit=body.find(value=>value.toLocaleLowerCase().includes(term)); if(!hit)return [];
        const at=hit.toLocaleLowerCase().indexOf(term), end=at+term.length;
        snippet=(at>20?"…":"")+esc(hit.slice(Math.max(0,at-20),at))+"<mark>"+esc(hit.slice(at,end))+"</mark>"+esc(hit.slice(end,end+35))+(end+35<hit.length?"…":"");
      }
      visible.add(entry.slug);
      return [articleRow(entry,snippet)];
    });
    document.querySelector<HTMLElement>(".result-count")!.textContent=`${rows.length} 篇文章`;
    document.getElementById("results")!.innerHTML=rows.join("")||'<p class="empty">没有找到文章。可以换个关键词或查看全部主题。</p>';
    document.querySelectorAll<HTMLElement>(".question[data-notes-for]").forEach(el=>{el.hidden=!visible.has(el.dataset.notesFor!);});
    document.querySelector<HTMLElement>(".archive-margin")!.hidden=rows.length===0;
  }
  function afterRender(route:string) {
    if(route!=="posts")return;
    const state=filterState(), input=document.querySelector<HTMLInputElement>("input[type=search]")!;
    const tags=Array.from(document.querySelectorAll<HTMLButtonElement>("[data-tag]"));
    input.addEventListener("input",()=>{state.query=input.value;applyFilters();});
    tags.forEach(button=>button.addEventListener("click",()=>{state.tag=button.dataset.tag||"";tags.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.tag===state.tag)));applyFilters();}));
    applyFilters();
  }
  preview.start({render,afterRender});
})();
