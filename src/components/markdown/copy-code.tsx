"use client";

import { useEffect, useRef, useState } from "react";

export function CopyCode({ source }: { source: string }) {
  const [status, setStatus] = useState<"copied" | "failed" | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(source);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    timer.current = window.setTimeout(() => setStatus(null), 2000);
  }

  const feedback =
    status === "copied" ? "已复制" : status === "failed" ? "复制失败" : "";
  return (
    <>
      <button
        type="button"
        className="markdown-copy"
        onClick={copy}
        aria-label="复制代码"
      >
        {feedback || "复制代码"}
      </button>
      <span className="sr-only" role="status">
        {feedback}
      </span>
    </>
  );
}
