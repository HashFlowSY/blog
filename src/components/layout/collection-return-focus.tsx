"use client";

import { useEffect } from "react";

import type { ContentCollection } from "@/lib/content-navigation";

export function CollectionReturnFocus({
  collection,
  search,
}: {
  collection: ContentCollection;
  search?: string;
}) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (search !== undefined && search !== window.location.search) return;
      const id = window.location.hash.slice(1);
      if (!id.startsWith(`${collection}-`)) return;
      const card = document.getElementById(id);
      if (!(card instanceof HTMLAnchorElement)) return;

      card.focus({ preventScroll: true });
      card.scrollIntoView({ block: "nearest", behavior: "instant" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [collection, search]);

  return null;
}
