"use strict";
(() => {
    const links = Array.from(document.querySelectorAll("nav a"));
    const baseline = document.querySelector(".baseline");
    const stage = document.getElementById("stage");
    const frames = new Map();
    let active;
    function select() {
        active = links.find(link => link.hash === location.hash) ?? links[0];
        for (const link of links) {
            if (link === active)
                link.setAttribute("aria-current", "page");
            else
                link.removeAttribute("aria-current");
        }
        for (const [hash, frame] of frames)
            frame.hidden = hash !== active.hash;
        // Keep the document alive after switching so an open excerpt or edited sample survives.
        if (!frames.has(active.hash)) {
            const frame = document.createElement("iframe");
            frame.title = active.textContent + "交互预览";
            frame.src = active.dataset.source;
            frames.set(active.hash, frame);
            stage.append(frame);
        }
        baseline.href = active.dataset.baseline;
        document.title = active.textContent + " · 三套博客预览";
    }
    window.addEventListener("hashchange", select);
    window.addEventListener("message", event => {
        if (event.data !== "focus-style-selector" || event.source !== frames.get(active.hash)?.contentWindow)
            return;
        if (event.origin === location.origin || (location.protocol === "file:" && event.origin === "null"))
            active.focus();
    });
    select();
})();
