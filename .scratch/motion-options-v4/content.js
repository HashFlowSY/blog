window.BlogContent = {
  "posts": [
    {
      "slug": "2026-05-02",
      "title": "用 Codex 定制桌面宠物：流程与踩坑",
      "summary": "记录从需求描述、参考图确认到动态资源验收的一次 Codex 宠物定制实践。",
      "date": "2026-05-02",
      "tags": [
        "Codex",
        "工具实践"
      ],
      "html": "<h2 id=\"user-content-为什么要做\" tabindex=\"-1\">为什么要做</h2>\n<p>Codex App 增加宠物功能后，我想做一个更符合自己偏好的版本。这个尝试看似轻量，但实际包含需求描述、视觉确认、动作设计和最终资源验收几个环节，很适合观察一套生成式工作流如何落地。</p>\n<h2 id=\"user-content-基本流程\" tabindex=\"-1\">基本流程</h2>\n<p>Codex 为自定义宠物提供了 Hatch Pet skill，可以直接在 App 中安装。启动后给出素材或文字描述，skill 会先生成一张基础参考图；确认方向后，再继续制作动作和运行所需的资源。</p>\n<p>如果对角色类型和动作要求不高，网络稳定时大约一小时可以完成。为了减少反复修改，最好在第一轮就明确：</p>\n<ul>\n<li>角色外形与比例。</li>\n<li>主色和需要避免的视觉元素。</li>\n<li>待机、移动和互动时的动作。</li>\n<li>最终尺寸、帧数和文件格式。</li>\n</ul>\n<h2 id=\"user-content-遇到的主要问题\" tabindex=\"-1\">遇到的主要问题</h2>\n<p>我最初希望角色接近一个已有游戏形象，但生成工具会主动规避明显的版权复刻。为此我尝试介入参考图生成环节，也测试了几种替代工具，最终确认继续追求高度相似并不是合适方向。</p>\n<h2 id=\"user-content-复盘\" tabindex=\"-1\">复盘</h2>\n<p>这次实践最有价值的部分不是宠物本身，而是进一步理解了 skill 的阶段划分：先确认视觉基线，再生成动作资产，最后验证运行效果。对类似生成任务来说，越早把可接受范围和验收条件说清楚，后续成本越低。</p>\n<p>最终得到的宠物也确实让工作环境更有趣，这就已经达到了目的。</p>"
    },
    {
      "slug": "2026-04-30",
      "title": "AI 服务中转站：常见术语与风险清单",
      "summary": "梳理官方订阅、API 转发、逆向渠道和计费倍率等常见术语，并标出需要重点留意的风险。",
      "date": "2026-04-30",
      "tags": [
        "AI 工具",
        "风险识别"
      ],
      "html": "<p>这份清单用于帮助初次接触 AI 服务中转站的人理解常见术语。价格、套餐和平台规则会变化，实际使用前仍应核对官方信息，并优先考虑账号、数据和支付安全。</p>\n<p>如果你已经在评估某家中转站，可以<a href=\"#user-content-使用前的检查清单\" data-heading=\"user-content-使用前的检查清单\">直达使用前的检查清单</a>。</p>\n<h2 id=\"user-content-术语表\" tabindex=\"-1\">术语表</h2>\n<h3 id=\"user-content-anthropic-官方claude\" tabindex=\"-1\">Anthropic 官方（Claude）</h3>\n<div class=\"markdown-table-scroll\" role=\"region\" aria-label=\"正文表格\" tabindex=\"0\"><table class=\"markdown-glossary\"><thead><tr><th scope=\"col\">术语</th><th scope=\"col\">说明</th></tr></thead><tbody><tr><td>Free</td><td>免费版。有消息上限，高峰期排队。</td></tr><tr><td>Pro</td><td>$20/月。用量比 Free 多，具体多少官方不说，可以网上看实测。</td></tr><tr><td>Max 5x</td><td>$100/月。用量是 Pro 的 5 倍。</td></tr><tr><td>Max 20x</td><td>$200/月。用量是 Pro 的 20 倍。</td></tr><tr><td>5x / 20x</td><td>相对 Pro 的用量比例，不是独立单位。Pro 能发 100 条，Max 5x 能发 500 条，大概是这个意思，但 Anthropic 不公布具体数字。</td></tr><tr><td>Session 用量</td><td>Claude 的用量按 session 计算，不是固定时间窗口，是模糊的会话边界。</td></tr><tr><td>Context window（上下文窗口）</td><td>单次对话能处理的文本长度上限，比如 200K token ≈ 15 万字。和每天能发多少条消息是两个独立的天花板。</td></tr><tr><td>Claude Code</td><td>AI 编程 Agent。</td></tr></tbody></table></div>\n<hr>\n<h3 id=\"user-content-openai-官方chatgpt\" tabindex=\"-1\">OpenAI 官方（ChatGPT）</h3>\n<div class=\"markdown-table-scroll\" role=\"region\" aria-label=\"正文表格\" tabindex=\"0\"><table class=\"markdown-glossary\"><thead><tr><th scope=\"col\">术语</th><th scope=\"col\">说明</th></tr></thead><tbody><tr><td>Free</td><td>免费版。</td></tr><tr><td>Go</td><td>介于 Free 和 Plus 之间的新档位，可以先忽略。</td></tr><tr><td>Plus</td><td>$20/月。能用 GPT-5，有 Deep Research 和 Codex，但有量的上限。</td></tr><tr><td>Pro $100（x5）</td><td>用量是 Plus 的 5 倍。中转站说的「Pro x5 号」一般来说就是这一档订阅的账号。</td></tr><tr><td>Pro $200（x20）</td><td>用量是 Plus 的 20 倍。「Pro x20 号」同理。</td></tr><tr><td>5 小时窗口</td><td>Codex 专属的计量周期，不是整个订阅只能用 5 小时。Codex 按「每 5 小时内能运行多少次任务」计算，和普通聊天的消息限制独立。具体流转流程可以看国内的 GLM Coding Plan。</td></tr><tr><td>Codex</td><td>OpenAI 的 AI 编程 。</td></tr></tbody></table></div>\n<hr>\n<h3 id=\"user-content-中转站\" tabindex=\"-1\">中转站</h3>\n<div class=\"markdown-table-scroll\" role=\"region\" aria-label=\"正文表格\" tabindex=\"0\"><table class=\"markdown-glossary\"><thead><tr><th scope=\"col\">术语</th><th scope=\"col\">说明</th></tr></thead><tbody><tr><td>中转站</td><td>帮国内用户绕过支付和网络的中间商。</td></tr><tr><td>官转</td><td>中转站持有真实 API Key，帮你转发请求。走的是真实 API，效果和官方一致。</td></tr><tr><td>逆向渠道</td><td>破解网页版登录态，把 API 请求伪装成普通用户聊天发出去。没有 API Key。价格极低，随时可能被检测封号，违反服务条款。</td></tr><tr><td>Token</td><td>AI 计费的最小单位。英文约 1 词 = 1 token，中文约 1-2 字 = 1 token。输出比输入贵 3-5 倍。</td></tr><tr><td>倍率</td><td>中转站相对官方 API 价格的定价系数。倍率 1 = 同价，0.8 = 八折。不要贪便宜，但可以都试试。</td></tr><tr><td>美刀（虚拟额度）</td><td>中转站内部记账单位，不是真实汇率兑换的美元。充 1 元人民币通常换 1 虚拟美元额度，各家不同。</td></tr><tr><td>号池</td><td>中转站维护的一批真实订阅账号，排队分配给用户共享使用。「Pro x5 号」就是号池里放的 Pro $100 账号。账号随时可能被平台封禁，风险自担。一般来说都是这个意思。</td></tr><tr><td>满血</td><td>完整的官方模型，没有削减参数。</td></tr><tr><td>阉割</td><td>用低级模型冒充高级模型，或限制输出长度、关闭部分功能。</td></tr><tr><td>Base URL</td><td>使用中转站时，替换官方地址的那个中转服务器地址。</td></tr><tr><td>OpenAI 兼容格式</td><td>事实行业标准。Claude、Gemini 的中转站也用 OpenAI 的接口格式，所以大部分客户端工具通用。</td></tr><tr><td>月抛站</td><td>运营周期极短的小型中转站，开几个月就跑路，充值有去无回。</td></tr></tbody></table></div>\n<h2 id=\"user-content-使用前的检查清单\" tabindex=\"-1\">使用前的检查清单</h2>\n<ul>\n<li>能否说明请求实际发送到哪里，是否保留日志或训练数据。</li>\n<li>是否支持小额测试，避免一次性充值过多。</li>\n<li>是否明确模型来源、倍率和失败退款规则。</li>\n<li>是否要求提交账号 Cookie、登录态或其他高风险凭据。</li>\n<li>是否准备了随时失效时的数据迁移和替代方案。</li>\n</ul>\n<p>如果业务内容涉及隐私、客户数据或生产环境，应优先使用官方渠道并完成必要的安全评估。</p>"
    }
  ],
  "project": {
    "slug": "personal-blog",
    "title": "Personal Blog",
    "summary": "Hashflow 的中文技术博客与作品集，收录 AI 工具实践和项目复盘。文章支持按主题筛选和全文搜索。",
    "date": "2026-04-02",
    "tags": [
      "nextjs",
      "typescript",
      "svg",
      "shiki",
      "github-pages",
      "tailwindcss"
    ],
    "result": "中文技术博客与作品集，已发布到 GitHub Pages。支持按主题筛选文章和搜索正文。",
    "role": "设计、开发和维护网站，并搭建 Markdown 发布流程",
    "duration": "2026 年 4 月至今",
    "source": "https://github.com/HashFlowSY/blog",
    "demo": "https://hashflowsy.github.io/blog/",
    "html": "<h2 id=\"user-content-概述\" tabindex=\"-1\">概述</h2>\n<p><a href=\"#posts\">技术写作</a>记录工具怎么用、实际操作中遇到了什么。<a href=\"#projects\">项目案例</a>说明我在项目里负责什么、为什么选了这个方案，以及结果怎么验证。</p>\n\n\n<h3 id=\"user-content-已发布文章\" tabindex=\"-1\">已发布文章</h3>\n<ul>\n<li>\n<p><a href=\"#post/2026-04-30\">AI 服务中转站：常见术语与风险清单</a></p>\n<p>梳理官方订阅、API 转发和计费倍率，列出使用前要核对的事项。</p>\n</li>\n<li>\n<p><a href=\"#post/2026-05-02\">用 Codex 定制桌面宠物：流程与踩坑</a></p>\n<p>记录从确认参考图到验收动作资源的定制过程。</p>\n</li>\n</ul>\n\n<h2 id=\"user-content-文章检索\" tabindex=\"-1\">文章检索</h2>\n<p>文章列表可以按主题筛选，也可以搜索标题、摘要、标签和正文。关键词只出现在正文里时，列表会显示包含它的片段。</p>\n\n\n<h3 id=\"user-content-搜索示例\" tabindex=\"-1\">搜索示例</h3>\n<p>搜索：<code>验收条件</code></p>\n<p><strong>用 Codex 定制桌面宠物：流程与踩坑</strong></p>\n<blockquote>\n<p>…越早把可接受范围和<strong>验收条件</strong>说清楚，后续成本越低。</p>\n</blockquote>\n<p><a href=\"#posts\" data-search=\"验收条件\">试这次搜索</a></p>\n\n<h2 id=\"user-content-首页交互工作台\" tabindex=\"-1\">首页交互工作台</h2>\n<p><a href=\"https://hashflowsy.github.io/blog/\">首页</a>的手绘工作台会在素材加载完毕并进入视口后自动播放。铅笔先画墙面、地面和透视线，再逐件画出桌子、电脑、盆栽和挂板工具，全程约 25 秒。切到后台时暂停，回到页面后接着画。</p>\n<p>收笔后，可以开关工作灯、拨动叶片，或操作笔记本、外接显示器和键盘，让对应的屏幕逐笔画出图纸。部件支持鼠标、触屏和键盘操作。系统开启「减少动态效果」时，直接显示完整工作台。</p>\n<p><a href=\"https://hashflowsy.github.io/blog/\">体验首页工作台</a> · <a href=\"https://github.com/HashFlowSY/blog/blob/083ac431f4daa60fd7cf570174562fa37709e8cc/docs/design/workbench-interaction-design.md\">工作台设计记录</a></p>\n\n\n<p><a href=\"assets/workbench.webp\"><img src=\"assets/workbench.webp\" alt=\"首页手绘工作台，桌面摆着两台设备，右下方有一格黄色抽屉\"></a></p>\n\n<h2 id=\"user-content-构建与发布\" tabindex=\"-1\">构建与发布</h2>\n<p>文章和项目案例都用 Markdown 编写。构建时校验内容字段并编译正文，然后用 Next.js 生成静态页面、文章搜索索引、RSS 和站点地图。读者搜索时，浏览器按需加载静态索引并匹配文章。</p>\n<h3 id=\"user-content-设计取舍\" tabindex=\"-1\">设计取舍</h3>\n<p>新增或修改内容后重新构建，访客打开时直接读取生成的文件。页面地址由 Markdown 中的 <code>slug</code> 字段决定，改标题或文件名时可以沿用原来的公开链接。<a href=\"https://github.com/HashFlowSY/blog/blob/44d8229/docs/adr/0001-keep-the-site-chinese-only-and-static.md\">静态托管决定</a></p>\n\n\n<h3 id=\"user-content-内容管线\" tabindex=\"-1\">内容管线</h3>\n<ol>\n<li>Markdown</li>\n<li>校验并编译</li>\n<li>导出 <code>out/</code></li>\n<li>浏览器检查</li>\n<li>发布到 Pages</li>\n</ol>\n<h4 id=\"user-content-测试与-ci\" tabindex=\"-1\">测试与 CI</h4>\n<p>GitHub Actions 对 <code>out/</code> 中的静态文件执行浏览器和无障碍检查，随后将同一份文件发布到 GitHub Pages。</p>\n<p>2026.11.19 · <a href=\"https://github.com/HashFlowSY/blog/actions/runs/44463840286\">查看 GitHub Pages 部署记录</a></p>\n\n<h2 id=\"user-content-实现细节\" tabindex=\"-1\">实现细节</h2>\n<h3 id=\"user-content-markdown-渲染与-xss-防护\" tabindex=\"-1\">Markdown 渲染与 XSS 防护</h3>\n<p>文章和项目共用 Markdown 编译器。编译时忽略原始 HTML，过滤元素和链接，再用 Shiki 给代码配色。<a href=\"https://github.com/HashFlowSY/blog/blob/44d8229/src/lib/markdown/compile.ts\">Markdown 编译器</a></p>\n<h3 id=\"user-content-cjk-阅读时间\" tabindex=\"-1\">CJK 阅读时间</h3>\n<p>文章按每分钟 500 个中日韩文字字符或 200 个其他词估算阅读时间。<a href=\"https://github.com/HashFlowSY/blog/blob/c57ab05f6eaa4ce5ee6e0a5090bfba1a26437660/src/lib/markdown/analyze.ts\">字词统计</a></p>\n<h3 id=\"user-content-文章推荐\" tabindex=\"-1\">文章推荐</h3>\n<p>最多推荐三篇有共同标签的文章。共同标签多的排在前面，数量相同时优先推荐发布日期更接近的文章。找不到同标签的文章时，展示其他最新文章。<a href=\"https://github.com/HashFlowSY/blog/blob/44d8229/src/lib/related-reading.ts\">推荐规则</a></p>\n<h3 id=\"user-content-中文单站与-seo\" tabindex=\"-1\">中文单站与 SEO</h3>\n<p>构建时根据站点域名和部署前缀生成规范网址与资源链接。<a href=\"https://hashflowsy.github.io/blog/feed.xml\">RSS</a> · <a href=\"https://hashflowsy.github.io/blog/sitemap.xml\">站点地图</a></p>"
  },
  "cover": "assets/workbench.webp",
  "screenshot": "assets/home.jpg"
};
