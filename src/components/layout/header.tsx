"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const navLinks = [
  { href: "/", label: "首页", route: "home" },
  { href: "/posts/", label: "文章", route: "articles" },
  { href: "/projects/", label: "项目", route: "projects" },
  { href: "/about/", label: "关于", route: "about" },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let ticking = false;

    function syncScrollState() {
      const compact =
        window.matchMedia?.("(max-width: 640px)").matches ?? false;
      const nextScrolled = window.scrollY > (compact ? 72 : 96);
      setIsScrolled(nextScrolled);
      document.body.classList.toggle("is-scrolled", nextScrolled);
      ticking = false;
    }

    function requestScrollSync() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(syncScrollState);
    }

    syncScrollState();
    window.addEventListener("scroll", requestScrollSync, { passive: true });
    return () => {
      window.removeEventListener("scroll", requestScrollSync);
      document.body.classList.remove("is-scrolled");
    };
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsMenuOpen(false);
      menuButtonRef.current?.focus();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <header
      className={[
        "site-header",
        isScrolled ? "is-scrolled" : "",
        isMenuOpen ? "is-menu-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="站点头部"
    >
      <Link className="brand-lockup" href="/" aria-label="回到首页">
        <span className="brand-mark">废</span>
        <span className="brand-text">
          <strong>Scraplog</strong>
          <span>废料通信站</span>
        </span>
      </Link>
      <button
        className="menu-toggle"
        type="button"
        aria-controls="site-nav"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((open) => !open)}
        ref={menuButtonRef}
      >
        菜单
      </button>
      <nav className="site-nav" id="site-nav" aria-label="主导航">
        {navLinks.map((link) => {
          const active = isActivePath(pathname, link.href);
          return (
            <Link
              key={link.route}
              className="nav-link"
              href={link.href}
              aria-current={active ? "page" : "false"}
              onClick={closeMenu}
              data-route-link={link.route}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
