import "./globals.css";
import "./studio.css";
import "./content.css";
import "./reading.css";

import { SiteShell } from "@/components/layout/site-shell";
import { SITE } from "@/lib/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
