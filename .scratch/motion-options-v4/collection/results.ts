(() => {
  type Snapshot = { number: HTMLElement; previous: string | null }[];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const running = new Map<HTMLElement, Animation>();
  const beforeChange = new WeakMap<Event, Snapshot>();
  const compositions = new WeakMap<Element, Snapshot>();
  const mark = "var(--result-mark)";

  function sampleFrom(target: EventTarget | null): Element | null {
    if (!(target instanceof Element)) return null;
    return target.closest("#sample-text, [data-preset]")?.closest(".lab") ?? null;
  }

  function snapshot(lab: Element): Snapshot {
    return Array.from(lab.querySelectorAll<HTMLElement>(".result :is([data-minute], [data-cjk], [data-words])"),
      number => ({ number, previous: number.textContent }));
  }

  function showChanges(saved: Snapshot) {
    if (reduce.matches) return;
    for (const { number, previous } of saved) {
      if (!number.isConnected || number.textContent === previous) continue;
      running.get(number)?.cancel();
      const animation = number.animate([
        { backgroundColor: mark, boxShadow: "0 0 0 .13em " + mark },
        { backgroundColor: "transparent", boxShadow: "0 0 0 .13em transparent" },
      ], { duration: 180, easing: "ease-out" });
      animation.id = "notebook-result";
      running.set(number, animation);
      animation.oncancel = animation.onfinish = () => {
        if (running.get(number) === animation) running.delete(number);
      };
    }
  }

  // Compare the values on either side of the existing form handler. The notebook
  // owns the calculation, rendering, keyboard behavior, and accessible output.
  function remember(event: Event) {
    if (event.type === "click" && !(event.target instanceof Element && event.target.closest("[data-preset]"))) return;
    const lab = sampleFrom(event.target);
    if (!lab || compositions.has(lab) || (event instanceof InputEvent && event.isComposing)) return;
    beforeChange.set(event, snapshot(lab));
  }
  function report(event: Event) {
    const saved = beforeChange.get(event);
    if (saved) showChanges(saved);
  }
  for (const name of ["input", "click"]) {
    document.addEventListener(name, remember, true);
    document.addEventListener(name, report);
  }

  document.addEventListener("compositionstart", event => {
    const lab = sampleFrom(event.target);
    if (lab) compositions.set(lab, snapshot(lab));
  }, true);
  document.addEventListener("compositionend", event => {
    const lab = sampleFrom(event.target);
    const saved = lab && compositions.get(lab);
    if (!lab || !saved) return;
    // Browsers can deliver the final input immediately after compositionend.
    requestAnimationFrame(() => {
      if (compositions.get(lab) !== saved) return;
      compositions.delete(lab);
      showChanges(saved);
    });
  });
  reduce.addEventListener("change", () => {
    if (reduce.matches) for (const animation of running.values()) animation.cancel();
  });
})();
