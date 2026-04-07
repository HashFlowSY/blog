"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Link } from "@/i18n/navigation";

export default function Error({
  error,
  unstable_retry: retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={retry}
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:opacity-80"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
