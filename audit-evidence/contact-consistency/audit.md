# “联系我”按钮一致性审计

状态：已于 2026-07-27 修复并通过逐页浏览器复核。

## 范围

- 页面：首页、项目、文章、关于
- 视口：1280 × 800
- 对象：顶部导航中的 `.nav-contact`，并补充检查页面内联系 CTA
- 初次审计只做诊断；后续已按建议完成修复

## 截图

1. `01-home.png` — 首页
2. `02-projects.png` — 项目页
3. `03-posts.png` — 文章页
4. `04-about.png` — 关于页

## 结论

顶部“联系我”虽然始终由 `Header` 组件中的同一个 `.nav-contact` 链接渲染，但基础样式没有定义在共享层，而是只写在首页作用域：

```css
body:has(.workbench-home) .nav-contact { ...完整尺寸和排版样式... }
```

非首页的 portfolio 作用域只覆盖了颜色，没有补上 display、padding、border-width、字体和文本变换：

```css
body:has(.portfolio-page) .nav-contact {
  border-color: #202326;
  background: #202326;
  color: #fffef8;
}
```

因此 portfolio 页面退回到普通链接默认值，并被 flex 容器拉伸到 44px 高。视觉上变成文字贴边的黑色块。

## 实测差异

| 属性           | 首页                 | 项目 / 文章 / 关于 |
| -------------- | -------------------- | ------------------ |
| display        | flex                 | block              |
| min-height     | 44px                 | auto               |
| padding        | 0 13px               | 0                  |
| border         | 1px solid            | 0px                |
| font           | JetBrains Mono，12px | 系统字体，17px     |
| text-transform | uppercase            | none               |
| 尺寸           | 64.76 × 44px         | 51.98 × 44px       |
| 默认状态       | 透明底、黑色描边     | 黑底、白字         |

## 次要原因

页面内容区还并存两套按钮原语：

- 首页：`.workbench-button`
- 其余页面：`.portfolio-button`

两者的字号、字重、圆角、悬停反馈和箭头使用不同。所以即便顶部导航修好，首页 Hero 的“联系我”和项目页底部的“联系我”仍不会完全一致。

## 建议修复顺序

1. 将 `.nav-contact` 的尺寸、布局、字体、边框和交互状态提取为无页面作用域的共享基础样式。
2. 页面作用域只保留主题变量或 variant，例如首页描边、内页实心。
3. 如果产品意图是让所有“联系我”承担同一优先级，再统一 `.workbench-button` 与 `.portfolio-button` 的 secondary variant；如果优先级不同，应明确保留 primary / secondary 语义，而不是按页面分别命名。

## 修复结果

顶部导航的 `.nav-contact` 已提取为共享基础样式，首页与 portfolio 页面使用同一个描边默认态和浅黄色 hover / focus 状态。首页、项目、文章、关于四个页面的实测结果现已完全一致：

- `display: flex`
- `min-height: 44px`
- `padding: 0 13px`
- `border: 1px solid`
- 等宽字体 `12px`
- 尺寸 `64.76 × 44px`

修复后截图：`../../qa-evidence/contact-button-unified.png`

## 可见性与无障碍风险

- 修复后按钮拥有稳定的 `64.76 × 44px` 点击区域，文字不再贴边。
- 截图无法确认完整键盘焦点顺序和屏幕阅读器表述；代码中链接语义和可访问名称本身是清楚的。
