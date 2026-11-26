interface PreviewPage {
  render(route: string): string;
  afterRender?(route: string): void;
}

interface LocationInPage {
  top: number;
  link?: string;
  ordinal?: number;
  search?: string;
  openDetails?: number[];
}

interface PreviewDestination {
  route: string;
  at?: string;
}

interface PreviewEntry extends PreviewDestination {
  key: number;
  from?: string;
  location?: LocationInPage;
}

interface Window {
  BlogPreview: { start(page: PreviewPage): void };
  BlogContent: {
    posts: { slug: string; title: string; date: string; summary: string; tags: string[]; html: string }[];
    project: { title: string; summary: string; role: string; result: string; tags: string[]; html: string };
    cover: string;
    screenshot: string;
  };
}

window.BlogPreview = {
  start(page) {
    const app = document.querySelector<HTMLElement>("#app")!;
    const routes = new Map([
      ["home", "首页"], ["projects", "项目"], ["project", "Personal Blog"],
      ["posts", "文章"], ["about", "关于"],
      ...window.BlogContent.posts.map(post => ["post/" + post.slug, post.title] as const)
    ]);
    const title = document.title;
    const isFolio = location.pathname.endsWith("/a.html");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const saved = new Map<number, LocationInPage>();
    const destination = (fragment: string): PreviewDestination | undefined => {
      const query = fragment.indexOf("?");
      const route = query < 0 ? fragment : fragment.slice(0, query);
      if (!routes.has(route)) return;
      const at = query < 0 ? undefined : new URLSearchParams(fragment.slice(query + 1)).get("at");
      return at ? {route, at} : {route};
    };
    const makeEntry = (target: PreviewDestination): PreviewEntry => ({...target, key: Math.random()});
    const sameDestination = (a: PreviewDestination, b: PreviewDestination) => a.route === b.route && a.at === b.at;
    function urlEntry(): PreviewEntry {
      const target = destination(location.hash.slice(1)) ?? {route: "home"};
      return history.state?.key && sameDestination(history.state, target) ? history.state : makeEntry(target);
    }
    let entry = urlEntry();
    let displayedKey: number | undefined;
    let revision = 0;
    let transition: ViewTransition | undefined;
    history.scrollRestoration = "manual";
    history.replaceState(entry, "");

    function capture(link: HTMLAnchorElement) {
      if (displayedKey !== entry.key) return;
      const value: LocationInPage = {top: window.scrollY};
      const input = app.querySelector<HTMLInputElement>('input[type="search"]');
      if (input) value.search = input.value;
      const details = Array.from(app.querySelectorAll("details"));
      if (details.length) value.openDetails = details.flatMap((item, index) => item.open ? [index] : []);
      value.link = link.getAttribute("href")!;
      const choices = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .filter(anchor => anchor.getAttribute("href") === value.link);
      value.ordinal = choices.indexOf(link);
      saved.set(entry.key, value);
      entry = {...entry, location: value};
      history.replaceState(entry, "");
    }

    function show(next: PreviewEntry, position?: LocationInPage, focusPage = true, keepDocument = false, restoring = false) {
      const {route, at} = next;
      if (!keepDocument) {
        app.innerHTML = page.render(route);
        page.afterRender?.(route);
      }
      displayedKey = next.key;
      document.title = routes.get(route) + " · " + title;
      if (position?.openDetails) {
        const opened = new Set(position.openDetails);
        app.querySelectorAll("details").forEach((details, index) => { details.open = opened.has(index); });
      }
      if (position?.search !== undefined) {
        const input = app.querySelector<HTMLInputElement>('input[type="search"]');
        if (input && input.value !== position.search) {
          input.value = position.search;
          input.dispatchEvent(new Event("input", {bubbles: true}));
        }
      }
      const section = at ? document.getElementById(at) : null;
      const links = position?.link
        ? Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
          .filter(link => link.getAttribute("href") === position.link)
        : [];
      const original = links[position?.ordinal ?? 0];
      // A question or experiment may itself have been opened at an addressable section.
      const returnToControl = restoring && original &&
        (route === "home" || original.closest("details"));
      if (section && app.contains(section) && !returnToControl) {
        // A linked heading can itself be inside one or more collapsed disclosures.
        for (let parent = section.parentElement; parent && parent !== app; parent = parent.parentElement) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
        }
        if (!section.hasAttribute("tabindex")) section.tabIndex = -1;
        section.focus({preventScroll: true});
        section.scrollIntoView({block: "start", behavior: "instant"});
        return;
      }
      window.scrollTo({top: position?.top ?? 0, behavior: "instant"});
      if (!focusPage) return;
      const focus = original?.getClientRects().length ? original
        : links.find(link => link.getClientRects().length) || app.querySelector<HTMLElement>("h1");
      if (focus) {
        if (!focus.matches("a[href]")) focus.tabIndex = -1;
        focus.focus({preventScroll: true});
      }
    }

    function update(next: PreviewEntry, restoring: boolean) {
      const previous = entry;
      const keepDocument = displayedKey === previous.key && previous.route === next.route;
      entry = next;
      const id = ++revision;
      const render = () => {
        if (id === revision) show(next, (restoring ? saved.get(next.key) : undefined) ?? next.location, true, keepDocument, restoring);
      };
      const coverPair = [previous.route, next.route];
      const shareCover = isFolio && !previous.at && !next.at && coverPair.includes("project") &&
        (coverPair.includes("home") || coverPair.includes("projects"));
      transition?.skipTransition();
      if (shareCover && !reduce.matches && document.startViewTransition) {
        transition = document.startViewTransition(render);
        transition.ready.catch(() => {});
        transition.finished.finally(() => { if (id === revision) transition = undefined; });
      } else render();
    }

    function readHistory() {
      const next = urlEntry();
      if (next.key === entry.key) return;
      if (history.state?.key !== next.key) history.replaceState(next, "");
      update(next, true);
    }
    window.addEventListener("popstate", readHistory);
    window.addEventListener("hashchange", readHistory);
    // Scroll during reading also belongs to this entry when the browser Back key is used.
    window.addEventListener("scroll", () => {
      if (displayedKey !== entry.key) return;
      const remembered = saved.get(entry.key) ?? entry.location;
      saved.set(entry.key, {...remembered, top: window.scrollY});
    }, {passive: true});

    document.addEventListener("click", event => {
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank") return;
      const href = link.getAttribute("href")!;
      if (!href.startsWith("#")) return;
      const fragment = href.slice(1);
      const targetRoute = destination(fragment);
      if (!targetRoute) {
        let target = document.getElementById(fragment);
        if (!target) {
          try { target = document.getElementById(decodeURIComponent(fragment)); } catch { return; }
        }
        if (target) {
          event.preventDefault();
          target.scrollIntoView({block: "start"});
          target.tabIndex = -1;
          target.focus({preventScroll: true});
        }
        return;
      }
      event.preventDefault();
      if (link.hasAttribute("data-return") && entry.from) {
        history.back();
        return;
      }
      if (sameDestination(entry, targetRoute)) {
        if (entry.at) show(entry, undefined, true, displayedKey === entry.key);
        else window.scrollTo({top: 0, behavior: "instant"});
        return;
      }
      capture(link);
      const next = {...makeEntry(targetRoute), from: entry.route};
      if (link.dataset.search) next.location = {top: 0, search: link.dataset.search};
      history.pushState(next, "", href);
      update(next, false);
    });
    show(entry, entry.location, false);
  }
};
