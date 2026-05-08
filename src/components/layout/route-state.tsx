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
    document.body.dataset["route"] = routeFromPathname(pathname);
  }, [pathname]);

  return null;
}
