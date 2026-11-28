"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

import { collectionCardId } from "@/lib/content-navigation";
import { assetPath } from "@/lib/site";

import {
  arriveProjectCover,
  cancelCoverMotion,
  captureProjectCover,
} from "./project-cover-motion";

interface Entry {
  slug: string;
  origin: "home" | "projects";
  id: string;
  top: number;
  withCover: boolean;
}
const eventName = "project-origin-changed";
let pending: Entry | undefined;
let restore: { id: string; top?: number } | undefined;
let displayedPath = "";
let detailVisit: { entry: Entry; state: Record<string, unknown> } | undefined;

function detailPath(slug: string) {
  return assetPath(`/projects/${slug}/`);
}

function originPath(origin: Entry["origin"]) {
  return assetPath(origin === "home" ? "/" : "/projects/");
}

function storedEntry(key: "projectOrigin" | "projectCard"): Entry | undefined {
  const entry: Partial<Entry> | null = history.state?.[key];
  if (
    !entry ||
    typeof entry.slug !== "string" ||
    typeof entry.id !== "string" ||
    typeof entry.top !== "number" ||
    typeof entry.withCover !== "boolean" ||
    (entry.origin !== "home" && entry.origin !== "projects")
  )
    return;
  return {
    slug: entry.slug,
    origin: entry.origin,
    id: entry.id,
    top: entry.top,
    withCover: entry.withCover,
  };
}

function storeEntry(key: "projectOrigin" | "projectCard", entry: Entry) {
  // Keep Next's own tree and history fields. This metadata belongs to one
  // visit, so a fresh tab or a different project cannot inherit a return link.
  history.replaceState({ ...history.state, [key]: entry }, "");
}

export function projectReturnHref(slug: string) {
  const entry = storedEntry("projectOrigin") ?? detailVisit?.entry;
  if (entry?.slug === slug && detailPath(slug) === location.pathname)
    return (entry.origin === "home" ? "/" : "/projects/") + "#" + entry.id;
  return "/projects/#projects-" + slug;
}

export function subscribeProjectOrigin(update: () => void) {
  window.addEventListener(eventName, update);
  return () => window.removeEventListener(eventName, update);
}

function onClick(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return;
  const anchor =
    event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement>("a[href]")
      : null;
  if (
    !anchor ||
    (anchor.target && anchor.target !== "_self") ||
    anchor.hasAttribute("download") ||
    anchor.origin !== location.origin
  )
    return;
  const slug = anchor.dataset["projectEntry"];
  const origin = location.pathname === originPath("home") ? "home" : "projects";
  if (
    slug &&
    location.pathname === originPath(origin) &&
    anchor.pathname === detailPath(slug)
  ) {
    pending = {
      slug,
      origin,
      top: scrollY,
      id:
        origin === "projects" ? collectionCardId("projects", slug) : anchor.id,
      withCover: !!anchor.querySelector("[data-project-cover]"),
    };
    storeEntry("projectCard", pending);
    if (pending.withCover) captureProjectCover(slug);
    else cancelCoverMotion();
    return;
  }
  pending = undefined;
  const returning = anchor.dataset["projectReturn"];
  const included = !!returning && detailPath(returning) === location.pathname;
  const source = storedEntry("projectOrigin") ?? detailVisit?.entry;
  restore = included
    ? {
        id: anchor.hash.slice(1),
        ...(source?.top !== undefined ? { top: source.top } : {}),
      }
    : undefined;
  if (included && source?.withCover !== false) captureProjectCover(returning);
  else cancelCoverMotion();
}

// Native fragment links create a history entry with no state. It is still
// the same project visit, including Next’s route state and its origin card.
function preserveChapterVisit() {
  if (
    detailVisit &&
    detailPath(detailVisit.entry.slug) === location.pathname &&
    !storedEntry("projectOrigin")
  ) {
    history.replaceState(
      {
        ...detailVisit.state,
        ...history.state,
        projectOrigin: detailVisit.entry,
      },
      "",
    );
  }
}

function onPopState() {
  // Chromium commits a native fragment in popstate; a reload can start before
  // the later hashchange task. Copy this visit onto that entry synchronously.
  if (displayedPath === location.pathname && location.hash) {
    preserveChapterVisit();
    return;
  }
  pending = undefined;
  restore = undefined;
  const card = storedEntry("projectCard");
  if (
    card &&
    displayedPath === detailPath(card.slug) &&
    location.pathname === originPath(card.origin)
  ) {
    restore = {
      id: card.id,
      top: card.top,
    };
    if (card.withCover) captureProjectCover(card.slug);
    else cancelCoverMotion();
    return;
  }
  const detail = storedEntry("projectOrigin");
  if (
    detail?.withCover &&
    displayedPath === originPath(detail.origin) &&
    location.pathname === detailPath(detail.slug)
  )
    captureProjectCover(detail.slug);
  else cancelCoverMotion();
}

export function ProjectNavigation() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    displayedPath = location.pathname;
    let chapterId: string | undefined;
    if (pending && detailPath(pending.slug) === location.pathname) {
      if (location.hash) chapterId = decodeURIComponent(location.hash.slice(1));
      storeEntry("projectOrigin", pending);
      window.dispatchEvent(new Event(eventName));
    }
    pending = undefined;
    const entry = storedEntry("projectOrigin");
    detailVisit =
      entry && detailPath(entry.slug) === location.pathname
        ? { entry, state: history.state }
        : undefined;
    let target = restore;
    restore = undefined;
    if (
      !target &&
      location.pathname === originPath("projects") &&
      location.hash.startsWith("#projects-")
    )
      target = { id: location.hash.slice(1) };

    const frame = requestAnimationFrame(() => {
      if (chapterId)
        document.getElementById(chapterId)?.focus({ preventScroll: true });
      if (target) {
        const card = document.getElementById(target.id);
        if (card instanceof HTMLAnchorElement) {
          card.focus({ preventScroll: true });
          if (target.top !== undefined)
            window.scrollTo({ top: target.top, behavior: "instant" });
          const rect = card.getBoundingClientRect();
          if (
            target.top === undefined ||
            rect.bottom <= 0 ||
            rect.top >= innerHeight
          )
            card.scrollIntoView({ block: "nearest", behavior: "instant" });
        }
      }
      arriveProjectCover();
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    window.addEventListener("hashchange", preserveChapterVisit);
    function onKey(event: KeyboardEvent) {
      if (
        [
          "Escape",
          " ",
          "PageDown",
          "PageUp",
          "End",
          "Home",
          "ArrowDown",
          "ArrowUp",
        ].includes(event.key)
      )
        cancelCoverMotion();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState, true);
    window.addEventListener("wheel", cancelCoverMotion, { passive: true });
    window.addEventListener("touchmove", cancelCoverMotion, { passive: true });
    window.addEventListener("resize", cancelCoverMotion);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduce.addEventListener("change", cancelCoverMotion);
    return () => {
      window.removeEventListener("hashchange", preserveChapterVisit);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
      window.removeEventListener("wheel", cancelCoverMotion);
      window.removeEventListener("touchmove", cancelCoverMotion);
      window.removeEventListener("resize", cancelCoverMotion);
      reduce.removeEventListener("change", cancelCoverMotion);
      cancelCoverMotion();
    };
  }, []);
  return null;
}
