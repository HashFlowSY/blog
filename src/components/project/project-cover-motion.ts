// Only the project's image is lifted. Routing, captions, native link actions,
// and the live workbench remain under their normal owners.
interface Shot {
  slug: string;
  source: string;
  fit: string;
  position: string;
  rect: DOMRect;
  border: string;
  radius: string;
  shadow: string;
  background: string;
}

let departure: Shot | undefined;
let active:
  | {
      slug: string;
      layer: HTMLElement;
      animation: Animation;
      reveal: () => void;
    }
  | undefined;

function coverFor(slug: string) {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-project-cover]"),
  ).find(
    (cover) =>
      cover.dataset["projectCover"] === slug && cover.getClientRects().length,
  );
}

function capture(element: HTMLElement, slug: string): Shot | undefined {
  const image = element.querySelector("img");
  const rect = element.getBoundingClientRect();
  if (
    !image ||
    !rect.width ||
    !rect.height ||
    rect.bottom <= 0 ||
    rect.top >= innerHeight ||
    rect.right <= 0 ||
    rect.left >= innerWidth
  )
    return;
  const style = getComputedStyle(element);
  const imageStyle = getComputedStyle(image);
  return {
    slug,
    source: image.currentSrc || image.src,
    fit: imageStyle.objectFit,
    position: imageStyle.objectPosition,
    rect,
    border: style.border,
    radius: style.borderRadius,
    shadow: style.boxShadow,
    background: style.backgroundColor,
  };
}

export function cancelCoverMotion() {
  departure = undefined;
  if (!active) return;
  const { animation, reveal } = active;
  active = undefined;
  animation.cancel();
  reveal();
}

function reduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function captureProjectCover(slug: string) {
  // If the reader immediately presses Back, pick up the image where it is
  // actually visible, even halfway between the two page layouts.
  const element = active?.slug === slug ? active.layer : coverFor(slug);
  const shot =
    element && !reduced() && typeof element.animate === "function"
      ? capture(element, slug)
      : undefined;
  cancelCoverMotion();
  departure = shot;
}

function frame(shot: Shot): Keyframe {
  return {
    transform: `translate3d(${shot.rect.x}px, ${shot.rect.y}px, 0)`,
    width: shot.rect.width + "px",
    height: shot.rect.height + "px",
    border: shot.border,
    borderRadius: shot.radius,
    boxShadow: shot.shadow,
    backgroundColor: shot.background,
  };
}

export function arriveProjectCover() {
  const from = departure;
  departure = undefined;
  if (!from || reduced()) return;
  const target = coverFor(from.slug);
  if (!target) return;
  const to = capture(target, from.slug);
  if (!to || from.source !== to.source) return;
  const layer = document.createElement("div");
  const image = document.createElement("img");
  image.alt = "";
  image.src = from.source;
  image.style.objectFit = to.fit;
  image.style.objectPosition = to.position;
  layer.className = "project-cover-flight";
  layer.setAttribute("aria-hidden", "true");
  layer.append(image);
  document.body.append(layer);
  target.setAttribute("data-cover-in-flight", "");
  const animation = layer.animate([frame(from), frame(to)], {
    duration: 490,
    easing: "cubic-bezier(.24,.75,.2,1)",
    fill: "both",
  });
  animation.id = "project-cover-handoff";
  function reveal() {
    target?.removeAttribute("data-cover-in-flight");
    layer.remove();
  }
  active = { slug: from.slug, layer, animation, reveal };
  animation.onfinish = () => {
    if (active?.animation === animation) cancelCoverMotion();
  };
}
