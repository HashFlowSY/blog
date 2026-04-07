import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

import { routing } from "@/i18n/routing";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">Page Not Found</p>
        <a
          href={`/${routing.defaultLocale}/`}
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
