import "./project-cover.css";

import type { ReactNode } from "react";

export function ProjectCover({
  slug,
  className,
  children,
}: {
  slug: string;
  className: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={className} data-project-cover={slug}>
      {children}
    </div>
  );
}
