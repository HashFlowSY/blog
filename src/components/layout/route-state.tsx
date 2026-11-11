"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function routeFromPathname(pathname: string): string {
  if (pathname.startsWith("/posts")) return "articles";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/about")) return "about";
  return "home";
}

export function RouteState() {
  const pathname = usePathname();

  useEffect(() => {
    const route = routeFromPathname(pathname);
    document.body.dataset["route"] = route;
    if (
      route === "articles" ||
      route === "projects" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const animation = document.getElementById("content")?.animate?.(
      [
        { opacity: 0.55, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    return () => animation?.cancel();
  }, [pathname]);

  return null;
}
