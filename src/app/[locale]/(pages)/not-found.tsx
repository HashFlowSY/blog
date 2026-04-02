"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
