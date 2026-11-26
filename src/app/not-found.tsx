import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <section className="notice-page" aria-labelledby="not-found-title">
      <small>404</small>
      <h1 id="not-found-title">页面不存在</h1>
      <p>这个链接可能已失效。你可以浏览文章，或返回首页。</p>
      <div className="notice-actions">
        <Link href="/posts/">浏览文章</Link>
        <Link href="/">返回首页</Link>
      </div>
    </section>
  );
}
