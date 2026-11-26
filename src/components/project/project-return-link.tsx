"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  projectReturnHref,
  subscribeProjectOrigin,
} from "./project-navigation";

export function ProjectReturnLink({
  slug,
  className,
  compact = false,
}: {
  slug: string;
  className: string;
  compact?: boolean;
}) {
  const href = useSyncExternalStore(
    subscribeProjectOrigin,
    () => projectReturnHref(slug),
    () => "/projects/#projects-" + slug,
  );
  const home = href.startsWith("/#");
  const label = home
    ? compact
      ? "返回首页"
      : href === "/#workbench-case"
        ? "返回首页工作台"
        : "返回首页代表项目"
    : compact
      ? "返回项目"
      : "返回项目列表";
  return (
    <Link className={className} data-project-return={slug} href={href} replace>
      <span aria-hidden="true">←</span> {label}
    </Link>
  );
}
