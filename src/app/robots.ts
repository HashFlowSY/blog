import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://hashflowsy.github.io";
const BASE_PATH = process.env.BASE_PATH || "";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${BASE_URL}${BASE_PATH}/sitemap.xml`,
  };
}
