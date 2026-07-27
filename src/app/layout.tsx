import "./globals.css";

import { SiteShell } from "@/components/layout/site-shell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Hashflow｜AI 全栈工程师",
    template: "%s | Hashflow",
  },
  description:
    "Hashflow 的个人作品站：记录 AI 应用、后端系统、自动化交付和长期写作。",
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
