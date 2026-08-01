"use client";

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
      <body className="flex min-h-screen items-center justify-center bg-background px-6">
        <title>页面暂时无法加载</title>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold tracking-tight">
            页面暂时无法加载
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            发生了意外错误，请稍后重试。
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={retry}
              className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
            >
              重试
            </button>
            <a
              href={siteUrl("/")}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:opacity-80"
            >
              返回首页
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
