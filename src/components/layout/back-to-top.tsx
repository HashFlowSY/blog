"use client";

function returnToTop(target: HTMLElement | null) {
  const { hash, pathname, search } = window.location;
  if (hash) window.history.replaceState(null, "", pathname + search);

  target?.focus({ preventScroll: true });

  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}

export function ReadingBackToTop({ titleId }: { titleId: string }) {
  return (
    <button
      className="detail-toolbar-control detail-back-to-top"
      type="button"
      onClick={() => returnToTop(document.getElementById(titleId))}
    >
      <span aria-hidden="true">↑</span> 回到顶部
    </button>
  );
}

export function BackToTop() {
  return (
    <button
      className="back-to-top"
      type="button"
      aria-label="回到顶部"
      onClick={() => {
        const detail = document.querySelector(".content-detail-page");
        returnToTop(
          detail
            ? detail.querySelector<HTMLElement>("h1")
            : document.getElementById("content"),
        );
      }}
    >
      TOP
    </button>
  );
}
