import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <section className="portfolio-page" aria-labelledby="not-found-title">
      <div className="portfolio-shell">
        <div className="studio-not-found">
          <p className="portfolio-overline">404 / missing signal</p>
          <h1 id="not-found-title">页面不存在</h1>
          <p>这个链接可能已失效。你可以浏览文章，或返回首页。</p>
          <div className="button-row">
            <Link
              className="portfolio-button portfolio-button-primary"
              href="/posts/"
            >
              浏览文章
            </Link>
            <Link className="portfolio-button" href="/">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
