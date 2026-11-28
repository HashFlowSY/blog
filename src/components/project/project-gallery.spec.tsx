import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { assetPath } from "@/lib/site";

import { ProjectGallery } from "./project-gallery";

const project = {
  slug: "release-notes",
  title: "Release Notes",
  cover: "/assets/cover.png",
};
const screenshot = {
  src: "/assets/search.png",
  label: "正文检索",
  caption: "从正文匹配到关键词的文章",
};

function expectImage(label: string, caption: string, src: string) {
  const original = screen.getByRole("link", {
    name: new RegExp(`查看原图：${label}`),
  });
  const image = within(original).getByRole("img");
  expect(original).toHaveAttribute("href", assetPath(src));
  expect(decodeURIComponent(image.getAttribute("src")!)).toContain(
    assetPath(src),
  );
  expect(
    screen
      .getByRole("figure", { name: "项目图片" })
      .querySelector("figcaption"),
  ).toHaveTextContent(caption);
}

describe("ProjectGallery", () => {
  it("opens the only cover at full size without rendering thumbnail choices", () => {
    render(<ProjectGallery {...project} />);
    expectImage("项目封面", "Release Notes · 项目封面", project.cover);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Release Notes界面预览",
    );
    expect(screen.getByRole("link", { name: /查看原图/ })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(
      screen.queryByRole("group", { name: "选择项目图片" }),
    ).not.toBeInTheDocument();
  });

  it("updates the picture, original link and caption together, including when returning to the cover", () => {
    render(<ProjectGallery {...project} screenshots={[screenshot]} />);
    const choices = within(screen.getByRole("group", { name: "选择项目图片" }));
    const cover = choices.getByRole("link", { name: "项目封面" });
    const search = choices.getByRole("link", { name: "正文检索" });

    fireEvent.click(search);
    expectImage(screenshot.label, screenshot.caption, screenshot.src);
    expect(screen.getByRole("img", { name: screenshot.caption })).toBeVisible();
    expect(search).toHaveAttribute("aria-current", "true");
    expect(cover).not.toHaveAttribute("aria-current");

    fireEvent.click(cover);
    expectImage("项目封面", "Release Notes · 项目封面", project.cover);
    expect(cover).toHaveAttribute("aria-current", "true");
    expect(search).not.toHaveAttribute("aria-current");
  });

  it("leaves modified thumbnail clicks to the browser with the full-size URL", () => {
    const canceled = vi.fn<(prevented: boolean) => void>();
    render(
      <div
        onClick={(event) => {
          canceled(event.defaultPrevented);
          event.preventDefault();
        }}
      >
        <ProjectGallery {...project} screenshots={[screenshot]} />
      </div>,
    );
    const link = screen.getByRole("link", { name: screenshot.label });
    expect(link).toHaveAttribute("href", assetPath(screenshot.src));
    for (const modifiers of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
    ]) {
      fireEvent.click(link, modifiers);
      expect(canceled).toHaveBeenLastCalledWith(false);
    }
    expectImage("项目封面", "Release Notes · 项目封面", project.cover);
  });
});
