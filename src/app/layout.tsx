import "./globals.css";

import { SiteShell } from "@/components/layout/site-shell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "废料通信站",
    template: "%s | 废料通信站",
  },
  description: "一个中文个人网站",
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
