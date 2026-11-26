"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  { href: "/", label: "首页" },
  { href: "/projects/", label: "项目" },
  { href: "/posts/", label: "文章" },
  { href: "/about/", label: "关于" },
] as const;

export function Header({ siteName }: { siteName: string }) {
  const pathname = usePathname();

  return (
    <header className="site-header" aria-label="站点头部">
      <Link className="brand-lockup" href="/" aria-label="回到首页">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <strong className="brand-name">{siteName}</strong>
      </Link>
      <nav className="site-nav" aria-label="主导航">
        {destinations.map(({ href, label }) => (
          <Link
            key={href}
            className="nav-link"
            href={href}
            aria-current={
              (
                href === "/"
                  ? pathname === href
                  : pathname === href.slice(0, -1) || pathname.startsWith(href)
              )
                ? "page"
                : "false"
            }
          >
            {label}
          </Link>
        ))}
      </nav>
      <Link className="header-contact" href="/about/#contact">
        联系我 <span aria-hidden="true">↗</span>
      </Link>
    </header>
  );
}
