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
  const current = destinations.findIndex(({ href }) =>
    href === "/"
      ? pathname === href
      : pathname === href.slice(0, -1) || pathname.startsWith(href),
  );
  const onAbout = destinations[current]?.href === "/about/";
  const ContactLink = onAbout ? "a" : Link;

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
        {destinations.map(({ href, label }, index) => (
          <Link
            key={href}
            className="nav-link"
            href={href}
            aria-current={index === current ? "page" : "false"}
          >
            {label}
          </Link>
        ))}
        {current >= 0 && (
          <span
            className="nav-current-track"
            aria-hidden="true"
            style={{
              backgroundPositionX: `${(current * 100) / (destinations.length - 1)}%`,
            }}
          />
        )}
      </nav>
      <ContactLink
        className="header-contact"
        href={onAbout ? "#contact" : "/about/#contact"}
      >
        联系我 <span aria-hidden="true">↗</span>
      </ContactLink>
    </header>
  );
}
