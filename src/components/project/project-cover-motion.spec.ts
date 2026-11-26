import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  arriveProjectCover,
  cancelCoverMotion,
  captureProjectCover,
} from "./project-cover-motion";

const slug = "personal-blog";
const imageURL = "/assets/personal-blog-home.jpg";
const cardRect = new DOMRect(60, 250, 160, 110);
const detailRect = new DOMRect(400, 80, 500, 350);
const animate = vi.fn(() => ({
  id: "",
  cancel: vi.fn(),
  onfinish: null as (() => void) | null,
}));
const previousAnimate = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "animate",
);
let reduceMotion = false;

function mountCover(rect: DOMRect, src = imageURL) {
  const cover = document.createElement("div");
  cover.dataset["projectCover"] = slug;
  const image = document.createElement("img");
  image.src = src;
  image.style.objectFit = "contain";
  cover.append(image);
  Object.defineProperties(cover, {
    getBoundingClientRect: { value: () => rect },
    getClientRects: { value: () => [rect] },
  });
  document.body.replaceChildren(cover);
  return cover;
}

describe("project cover handoff", () => {
  beforeEach(() => {
    reduceMotion = false;
    vi.stubGlobal("matchMedia", () => ({ matches: reduceMotion }));
    Object.defineProperty(HTMLElement.prototype, "animate", {
      value: animate,
      configurable: true,
    });
    animate.mockClear();
  });

  afterEach(() => {
    cancelCoverMotion();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    if (previousAnimate)
      Object.defineProperty(HTMLElement.prototype, "animate", previousAnimate);
    else Reflect.deleteProperty(HTMLElement.prototype, "animate");
  });

  it("moves the matching image and reveals the real destination on finish", () => {
    mountCover(cardRect);
    captureProjectCover(slug);
    const detail = mountCover(detailRect);
    arriveProjectCover();

    const flight = document.querySelector(".project-cover-flight");
    expect(flight).toHaveAttribute("aria-hidden", "true");
    expect(flight?.querySelector("img")).toHaveAttribute(
      "src",
      new URL(imageURL, location.href).href,
    );
    expect(detail).toHaveAttribute("data-cover-in-flight");
    expect(animate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          width: "160px",
          transform: "translate3d(60px, 250px, 0)",
        }),
        expect.objectContaining({
          width: "500px",
          transform: "translate3d(400px, 80px, 0)",
        }),
      ],
      expect.objectContaining({ duration: 490 }),
    );
    animate.mock.results[0]?.value.onfinish?.();
    expect(flight).not.toBeInTheDocument();
    expect(detail).not.toHaveAttribute("data-cover-in-flight");
  });

  it("reverses from the visible position and ignores the older finish callback", () => {
    mountCover(cardRect);
    captureProjectCover(slug);
    mountCover(detailRect);
    arriveProjectCover();
    const first = animate.mock.results[0]!.value;
    const firstLayer = document.querySelector(".project-cover-flight")!;
    Object.defineProperty(firstLayer, "getBoundingClientRect", {
      value: () => new DOMRect(130, 120, 280, 210),
    });
    captureProjectCover(slug);
    const card = mountCover(cardRect);
    arriveProjectCover();
    expect(first.cancel).toHaveBeenCalledOnce();
    expect(animate).toHaveBeenLastCalledWith(
      [
        expect.objectContaining({ width: "280px" }),
        expect.objectContaining({ width: "160px" }),
      ],
      expect.any(Object),
    );
    first.onfinish?.();
    expect(card).toHaveAttribute("data-cover-in-flight");
    cancelCoverMotion();
    expect(card).not.toHaveAttribute("data-cover-in-flight");
    expect(document.querySelector(".project-cover-flight")).toBeNull();
  });

  it("keeps the destination visible when motion preference changes between pages", () => {
    mountCover(cardRect);
    captureProjectCover(slug);
    reduceMotion = true;
    const detail = mountCover(detailRect);
    arriveProjectCover();
    expect(animate).not.toHaveBeenCalled();
    expect(detail).not.toHaveAttribute("data-cover-in-flight");
  });

  it("leaves unrelated, offscreen, or missing covers alone", () => {
    mountCover(cardRect);
    captureProjectCover(slug);
    mountCover(detailRect, "/a-different-project.jpg");
    arriveProjectCover();

    mountCover(new DOMRect(0, -200, 150, 100));
    captureProjectCover(slug);
    mountCover(detailRect);
    arriveProjectCover();

    captureProjectCover(slug);
    document.body.replaceChildren();
    arriveProjectCover();
    expect(animate).not.toHaveBeenCalled();
  });
});
