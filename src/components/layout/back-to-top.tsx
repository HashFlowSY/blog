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

export function BackToTop({
  targetId,
  placement,
}: {
  targetId: string;
  placement: "site" | "detail";
}) {
  const detail = placement === "detail";
  return (
    <button
      className={detail ? "reader-top" : "back-to-top"}
      type="button"
      aria-label="回到顶部"
      onClick={() => returnToTop(document.getElementById(targetId))}
    >
      {detail ? (
        <>
          <span aria-hidden="true">↑</span> 回到顶部
        </>
      ) : (
        "TOP"
      )}
    </button>
  );
}
