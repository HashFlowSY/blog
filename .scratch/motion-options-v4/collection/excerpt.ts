interface ExcerptPage {
  render(route: string): string;
  afterRender?(route: string): void;
}
interface ExcerptMotion {
  opening: boolean;
  animation: Animation;
  settle(): void;
}

(() => {
  const { BlogPreview } = window as typeof window & { BlogPreview: { start(page: ExcerptPage): void } };
  const startPage = BlogPreview.start.bind(BlogPreview);
  const reductionQuery = "(prefers-reduced-motion: reduce)";
  const reduce = matchMedia(reductionQuery);
  const moving = new Map<HTMLDetailsElement, ExcerptMotion>();

  function finishMotions() {
    for (const motion of moving.values()) motion.settle();
  }

  function prepareQuestions() {
    document.querySelectorAll<HTMLDetailsElement>(".question").forEach(question => {
      question.open = false;
      const summary = question.querySelector("summary")!;
      const excerpt = question.querySelector<HTMLElement>(".excerpt")!;
      const clip = document.createElement("div");
      clip.className = "excerpt-window";
      excerpt.before(clip);
      clip.append(excerpt);

      // Native summary activation also sends click for Enter, Space, and assistive input.
      summary.addEventListener("click", event => {
        if (event.defaultPrevented || event.button !== 0) return;
        event.preventDefault();
        const prior = moving.get(question);
        const opening = prior ? !prior.opening : !question.open;
        const height = question.open ? clip.getBoundingClientRect().height : 0;
        const opacity = question.open ? Number(getComputedStyle(clip).opacity) : 0;
        if (prior) {
          prior.animation.onfinish = null;
          prior.animation.cancel();
          moving.delete(question);
        }
        if (!opening && clip.contains(document.activeElement)) summary.focus({preventScroll: true});
        question.open = true;
        clip.inert = !opening;
        const fullHeight = excerpt.getBoundingClientRect().height;
        const target = opening ? fullHeight : 0;
        let animation: Animation | undefined;
        function settle() {
          if (animation) {
            animation.onfinish = null;
            animation.cancel();
          }
          moving.delete(question);
          question.open = opening;
          clip.inert = false;
          delete question.dataset.intent;
          summary.removeAttribute("aria-expanded");
        }
        if (matchMedia(reductionQuery).matches || !clip.animate || !fullHeight || Math.abs(height - target) < 1) {
          settle();
          return;
        }
        // The native disclosure stays drawable until the outgoing quote folds away.
        // Its hidden links stop accepting focus as soon as the reader closes the quote.
        question.dataset.intent = opening ? "open" : "closed";
        summary.setAttribute("aria-expanded", String(opening));
        const distance = Math.min(1, Math.abs(target - height) / fullHeight);
        animation = clip.animate(
          [{height: height + "px", opacity}, {height: target + "px", opacity: opening ? 1 : 0}],
          {duration: Math.max(70, 260 * distance), easing: "cubic-bezier(.24,.66,.24,1)", fill: "both"}
        );
        moving.set(question, {opening, animation, settle});
        animation.onfinish = settle;
      });
    });
  }

  // Commit the intended disclosure state before the shared router records history.
  document.addEventListener("click", event => {
    if (event.target instanceof Element && event.target.closest("a[href]")) finishMotions();
  }, true);
  reduce.addEventListener("change", () => { if (reduce.matches) finishMotions(); });
  let columnWidth = document.documentElement.clientWidth;
  window.addEventListener("resize", () => {
    const width = document.documentElement.clientWidth;
    if (width !== columnWidth) finishMotions();
    columnWidth = width;
  });

  BlogPreview.start = page => startPage({
    render: page.render,
    afterRender(route) {
      finishMotions();
      page.afterRender?.(route);
      // The router restores saved <details> after this hook. Restored content appears at rest.
      if (document.querySelector(".question")) prepareQuestions();
    }
  });
})();
