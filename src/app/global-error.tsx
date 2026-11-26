"use client";

import "./globals.css";

import { useEffect } from "react";

import { siteUrl } from "@/lib/site";

export default function GlobalError({
  error,
  unstable_retry: retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <title>页面暂时无法加载</title>
        <div className="site-frame">
          <main className="notice-page">
            <h1>页面暂时无法加载</h1>
            <p>发生了意外错误，请稍后重试。</p>
            <div className="notice-actions">
              <button type="button" onClick={retry}>
                重试
              </button>
              <a href={siteUrl("/")}>返回首页</a>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
