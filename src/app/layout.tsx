import "./globals.css";
import "./studio.css";

import { SiteShell } from "@/components/layout/site-shell";
import { assetPath, SITE } from "@/lib/site";

import type { Metadata } from "next";
import type { CSSProperties } from "react";

const paperStyle: CSSProperties & { "--studio-paper-grain": string } = {
  "--studio-paper-grain": `url("${assetPath("/assets/sketchbook-paper.webp")}")`,
};

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
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body style={paperStyle}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
