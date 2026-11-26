"use strict";
(() => {
    function read() {
        return new URLSearchParams(location.search).get("finish") === "baseline" ? "baseline" : "paper";
    }
    function show(finish) {
        document.documentElement.dataset.surface = finish;
        document.querySelectorAll("[data-finish]").forEach(button => {
            button.setAttribute("aria-pressed", String(button.dataset.finish === finish));
        });
    }
    show(read());
    document.addEventListener("DOMContentLoaded", () => {
        show(read());
        document.querySelector(".finishes").addEventListener("click", event => {
            const button = event.target instanceof Element && event.target.closest("button[data-finish]");
            if (!button)
                return;
            const finish = button.dataset.finish === "baseline" ? "baseline" : "paper";
            show(finish);
            if (location.protocol === "file:")
                return;
            const url = new URL(location.href);
            if (finish === "baseline")
                url.searchParams.set("finish", finish);
            else
                url.searchParams.delete("finish");
            history.replaceState(history.state, "", url);
        });
    });
})();
