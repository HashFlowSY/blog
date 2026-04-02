"use client";

import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {year} {t("rights")}
          </p>
          <p className="text-sm text-muted-foreground">{t("builtWith")}</p>
        </div>
      </div>
    </footer>
  );
}
