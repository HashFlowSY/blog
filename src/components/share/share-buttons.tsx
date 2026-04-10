"use client";

import { Check, Link as LinkIcon, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ShareButtonsProps {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const t = useTranslations("postPage");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url, title });
      } catch {
        // User cancelled or share failed — do nothing
      }
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — do nothing
    }
  }

  function handleTwitter() {
    const text = encodeURIComponent(title);
    const shareUrl = encodeURIComponent(url);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`,
      "_blank",
      "noopener,noreferrer,width=550,height=420",
    );
  }

  const canUseNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="flex items-center gap-2">
      {canUseNativeShare && (
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t("share")}
        >
          <Share2 className="h-4 w-4" />
          <span>{t("share")}</span>
        </button>
      )}

      <button
        type="button"
        onClick={handleTwitter}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        aria-label={t("shareOnX")}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span>X</span>
      </button>

      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        aria-label={t("copyLink")}
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <LinkIcon className="h-4 w-4" />
        )}
        <span>{copied ? t("copied") : t("copyLink")}</span>
      </button>
    </div>
  );
}
