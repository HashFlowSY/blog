import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assetPath } from "@/lib/site";

import {
  arriveProjectCover,
  cancelCoverMotion,
  captureProjectCover,
} from "./project-cover-motion";
import { ProjectNavigation } from "./project-navigation";
import { ProjectReturnLink } from "./project-return-link";

vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }));
vi.mock("./project-cover-motion", () => ({
  arriveProjectCover: vi.fn(),
  cancelCoverMotion: vi.fn(),
  captureProjectCover: vi.fn(),
}));

const slug = "personal-blog";
const detail = "/projects/personal-blog/";
const nextState = { routeTree: "kept by the router" };
let media: EventTarget;

function Page() {
  const isDetail = location.pathname === assetPath(detail);
  const home = location.pathname === assetPath("/");
  return (
    <>
      <ProjectNavigation />
      {isDetail ? (
        <>
          <ProjectReturnLink slug={slug} className="return" />
          <ProjectReturnLink slug={slug} className="return" compact />
        </>
      ) : (
        <>
          <a
            id={home ? "featured-" + slug : "projects-" + slug}
            href={assetPath(detail)}
            data-project-entry={slug}
          >
            <span data-project-cover={slug}>项目封面</span>
          </a>
          {home && (
            <a
              id="workbench-case"
              href={assetPath(detail)}
              data-project-entry={slug}
            >
              图注
            </a>
          )}
        </>
      )}
    </>
  );
}

// In the real app Next writes a history entry and commits the new route.
// Traversal dispatches popstate while the outgoing page is still displayed.
function mount(path: string, state: unknown = nextState) {
  history.replaceState(state, "", assetPath(path));
  const view = render(<Page />);
  return {
    unmount: view.unmount,
    move(destination: string, entry: unknown = nextState, traverse = false) {
      act(() => {
        history.replaceState(entry, "", assetPath(destination));
        if (traverse)
          window.dispatchEvent(new PopStateEvent("popstate", { state: entry }));
        view.rerender(<Page />);
      });
    },
  };
}

const preventNative = (event: Event) => event.preventDefault();
const nearest = vi.fn();
const originalScroll = HTMLElement.prototype.scrollIntoView;

beforeEach(() => {
  vi.clearAllMocks();
  media = new EventTarget();
  vi.stubGlobal("matchMedia", () => media);
  vi.stubGlobal("scrollY", 203);
  vi.stubGlobal("scrollTo", vi.fn());
  HTMLElement.prototype.scrollIntoView = nearest;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  document.addEventListener("click", preventNative);
});
afterEach(() => {
  cleanup();
  document.removeEventListener("click", preventNative);
  HTMLElement.prototype.scrollIntoView = originalScroll;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("project navigation history", () => {
  it.each([
    ["/", "项目封面", "featured-" + slug, "返回首页代表项目", "返回首页", true],
    ["/", "图注", "workbench-case", "返回首页工作台", "返回首页", false],
    [
      "/projects/",
      "项目封面",
      "projects-" + slug,
      "返回项目列表",
      "返回项目",
      true,
    ],
  ] as const)(
    "keeps the origin, scroll and focus for %s %s",
    (path, name, id, label, shortLabel, hasCover) => {
      const route = mount(path);
      fireEvent.click(screen.getByText(name));
      expect(history.state).toMatchObject({
        ...nextState,
        projectCard: { id, top: 203, withCover: hasCover },
      });
      expect(captureProjectCover).toHaveBeenCalledTimes(hasCover ? 1 : 0);
      route.move(detail);
      expect(history.state).toMatchObject({
        ...nextState,
        projectOrigin: { slug, id },
      });
      expect(screen.getByRole("link", { name: shortLabel })).toHaveAttribute(
        "href",
        path + "#" + id,
      );
      fireEvent.click(screen.getByRole("link", { name: label }));
      route.move(path + "#" + id);
      expect(document.getElementById(id)).toHaveFocus();
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 203,
        behavior: "instant",
      });
      expect(nearest).toHaveBeenCalledWith({
        block: "nearest",
        behavior: "instant",
      });
      expect(captureProjectCover).toHaveBeenCalledTimes(hasCover ? 2 : 0);
      expect(arriveProjectCover).toHaveBeenCalledTimes(3);
    },
  );

  it.each([true, false])(
    "restores traversed entries and only pairs covers when present (%s)",
    (withCover) => {
      const route = mount("/");
      fireEvent.click(screen.getByText(withCover ? "项目封面" : "图注"));
      const origin = history.state;
      route.move(detail);
      const caseState = history.state;
      vi.mocked(captureProjectCover).mockClear();
      route.move("/", origin, true);
      expect(document.getElementById(origin.projectCard.id)).toHaveFocus();
      route.move(detail, caseState, true);
      expect(captureProjectCover).toHaveBeenCalledTimes(withCover ? 2 : 0);
      route.move("/about/", nextState, true);
      expect(cancelCoverMotion).toHaveBeenCalled();
      expect(captureProjectCover).toHaveBeenCalledTimes(withCover ? 2 : 0);
    },
  );

  it.each(["popstate", "hashchange"])(
    "carries the same visit through a native chapter and immediate remount on %s",
    (eventName) => {
      const route = mount("/");
      fireEvent.click(screen.getByText("图注"));
      route.move(detail);
      history.pushState(null, "", "#chapter");
      fireEvent(window, new Event(eventName));
      expect(history.state).toMatchObject({
        ...nextState,
        projectOrigin: { id: "workbench-case" },
      });
      const restored = history.state;
      route.unmount();
      mount(detail + "#chapter", restored);
      expect(
        screen.getByRole("link", { name: "返回首页工作台" }),
      ).toHaveAttribute("href", "/#workbench-case");
    },
  );

  it("uses the static list fallback for a direct visit and unrelated or malformed history", () => {
    const route = mount(detail);
    expect(
      renderToString(<ProjectReturnLink slug={slug} className="back" />),
    ).toContain("/projects/#projects-" + slug);
    fireEvent.click(screen.getByRole("link", { name: "返回项目列表" }));
    route.move("/projects/#projects-" + slug);
    expect(document.getElementById("projects-" + slug)).toHaveFocus();
    expect(window.scrollTo).not.toHaveBeenCalled();
    const valid = {
      slug,
      id: "workbench-case",
      top: 12,
      withCover: false,
      origin: "home",
    };
    const invalid = [
      { slug: null },
      { id: 7 },
      { top: "203" },
      { withCover: 1 },
      { origin: "other" },
      { slug: "different" },
    ];
    for (const patch of invalid) {
      route.move(detail, { projectOrigin: { ...valid, ...patch } });
      expect(
        screen.getByRole("link", { name: "返回项目列表" }),
      ).toHaveAttribute("href", "/projects/#projects-" + slug);
      route.move("/about/");
    }
  });

  it("leaves modified, downloaded, external, new-tab and unrelated clicks to the browser", () => {
    const route = mount("/");
    const link = screen.getByRole("link", { name: "项目封面" });
    for (const options of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { shiftKey: true },
      { button: 1 },
    ]) {
      fireEvent.click(link, options);
    }
    const prevented = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    prevented.preventDefault();
    fireEvent(link, prevented);
    fireEvent.click(document);
    fireEvent.click(document.body);
    link.setAttribute("target", "_blank");
    fireEvent.click(link);
    link.removeAttribute("target");
    link.setAttribute("download", "");
    fireEvent.click(link);
    link.removeAttribute("download");
    link.setAttribute("href", "https://example.com/");
    fireEvent.click(link);
    link.setAttribute("href", assetPath("/about/"));
    fireEvent.click(link);
    route.move("/about/");
    fireEvent.click(screen.getByRole("link", { name: "项目封面" }));
    expect(history.state).toEqual(nextState);
    expect(captureProjectCover).not.toHaveBeenCalled();
  });

  it("cancels on scroll intent or a preference change and releases its listeners on unmount", () => {
    const route = mount("/");
    fireEvent.keyDown(document, { key: "Enter" });
    expect(cancelCoverMotion).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "PageDown" });
    fireEvent.wheel(window);
    fireEvent.touchMove(window);
    fireEvent.resize(window);
    media.dispatchEvent(new Event("change"));
    expect(cancelCoverMotion).toHaveBeenCalledTimes(5);
    route.unmount();
    vi.mocked(cancelCoverMotion).mockClear();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.wheel(window);
    media.dispatchEvent(new Event("change"));
    expect(cancelCoverMotion).not.toHaveBeenCalled();
  });
});
