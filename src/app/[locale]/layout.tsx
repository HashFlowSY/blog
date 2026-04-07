import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SkipLink } from "@/components/layout/skip-link";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site";

import type { Metadata } from "next";

export const dynamic = "force-static";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "layout" });
  const baseUrl = siteUrl("");

  return {
    metadataBase: new URL(baseUrl),
    title: {
      template: `%s | ${t("siteName")}`,
      default: t("siteName"),
    },
    description: t("description"),
    alternates: {
      canonical: siteUrl(`/${locale}/`),
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, siteUrl(`/${l}/`)]),
      ),
      types: {
        "application/rss+xml": siteUrl(
          `/${locale === "zh-CN" ? "" : `${locale}/`}feed.xml`,
        ),
      },
    },
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      locale: locale.replace("-", "_"),
    },
    twitter: {
      card: "summary_large_image",
      site: t("siteName"),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen flex-col">
        <SkipLink />
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <AnalyticsProvider
          {...(process.env["NEXT_PUBLIC_PLAUSIBLE_DOMAIN"]
            ? {
                plausibleDomain: process.env["NEXT_PUBLIC_PLAUSIBLE_DOMAIN"],
              }
            : {})}
          {...(process.env["NEXT_PUBLIC_UMAMI_ID"]
            ? { umamiWebsiteId: process.env["NEXT_PUBLIC_UMAMI_ID"] }
            : {})}
        />
      </div>
    </NextIntlClientProvider>
  );
}
