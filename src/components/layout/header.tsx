"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", key: "home" },
  { href: "/posts/", key: "posts" },
  { href: "/projects/", key: "projects" },
  { href: "/about/", key: "about" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const tLayout = useTranslations("layout");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const targetLocale = locale === "zh-CN" ? "en-US" : "zh-CN";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-lg font-bold hover:opacity-80 transition-opacity"
        >
          {tLayout("siteName")}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={cn(
                "text-sm transition-colors hover:opacity-80",
                pathname === link.href ||
                  (link.href !== "/" &&
                    pathname.startsWith(link.href.replace(/\/$/, "")))
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {t(link.key)}
            </Link>
          ))}
          <Link
            href={pathname}
            locale={targetLocale}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {locale === "zh-CN" ? "EN" : "中文"}
          </Link>
          <ThemeToggle />
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden p-2"
          aria-label="Toggle menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t border-border bg-background px-6 py-4 sm:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "text-sm transition-colors",
                  pathname === link.href ||
                    (link.href !== "/" &&
                      pathname.startsWith(link.href.replace(/\/$/, "")))
                    ? "font-medium"
                    : "text-muted-foreground",
                )}
              >
                {t(link.key)}
              </Link>
            ))}
            <Link
              href={pathname}
              locale={targetLocale}
              onClick={() => setMobileOpen(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {locale === "zh-CN" ? "EN" : "中文"}
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}
