import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compileMarkdownDocuments } from "@/lib/markdown/compile";

import { ProjectStory } from "./project-story";

async function renderStory(body: string) {
  const filePath = "content/projects/zh-CN/project.md";
  const compiled = await compileMarkdownDocuments(
    [{ filePath, bodyLine: 1, title: "项目", body }],
    { basePath: "/blog" },
  );
  const project = compiled.get(filePath);
  if (!project) throw new Error("Expected a compiled project.");
  return render(<ProjectStory id="project-body" tree={project.tree} />);
}

describe("Project story", () => {
  it("renders Markdown with no numbered chapters as readable text", async () => {
    await renderStory("记录一次发布，源码见[项目列表](/projects/)。");
    expect(screen.getByRole("link", { name: "项目列表" })).toHaveAttribute(
      "href",
      "/blog/projects/",
    );
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("preserves section targets, footnotes and tables across the chapter split", async () => {
    await renderStory(`## 决策

查看[结果](#结果)，另见说明[^method]。

---

### 结果

| 输入 | 输出 |
| --- | --- |
| 网格 | 64 |

## 复盘

下次验证更多网格。

[^method]: 在同一机器复验。`);

    const decision = screen.getByRole("region", { name: "决策" });
    const result = within(decision).getByRole("heading", { name: "结果" });
    expect(
      within(decision).getByRole("link", { name: "结果" }),
    ).toHaveAttribute("href", `#${result.id}`);
    expect(within(decision).getByRole("table")).toHaveTextContent("64");
    const reference = within(decision).getByRole("link", { name: "1" });
    const note = screen.getByText("在同一机器复验。", { exact: false });
    expect(reference).toHaveAttribute("href", `#${note.closest("li")?.id}`);
    expect(note.closest("section")).toHaveAttribute("data-footnotes");
    expect(screen.getByRole("region", { name: "复盘" })).toHaveTextContent(
      "下次验证更多网格。",
    );
  });
});
