(() => {
  const style = location.pathname.split("/").pop()!.charAt(0);
  const app = document.getElementById("app")!;
  function update() {
    // Source links in project records should open outside the embedded blog.
    if (parent !== window) {
      const external = app.querySelectorAll<HTMLAnchorElement>('a[href^="https://"]:not([target]), a[href^="http://"]:not([target])');
      for (const link of external) {
        if (link.origin === location.origin) continue;
        link.target = "_blank";
        link.relList.add("noopener");
      }
    }
    const link = app.querySelector<HTMLAnchorElement>("a.compare");
    if (!link) return;
    link.href = "index.html#" + style;
    link.target = "_top";
  }
  new MutationObserver(update).observe(app, {childList: true});
  update();
  app.addEventListener("click", event => {
    if (parent === window || event.button || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (!(event.target instanceof Element) || !event.target.closest("a.compare")) return;
    event.preventDefault();
    parent.postMessage("focus-style-selector", "*");
  });
})();
