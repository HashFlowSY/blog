import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh-CN", "en-US"],
  defaultLocale: "zh-CN",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/** Generate static params for locale-only pages. */
export function localeParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

/** Generate static params for locale + extra fields (e.g. slug). */
export function localeParamsWith<T extends Record<string, string>>(
  items: T[],
): ({ locale: string } & T)[] {
  return routing.locales.flatMap((locale) =>
    items.map((item) => ({ locale, ...item })),
  );
}
