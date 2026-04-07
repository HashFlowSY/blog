import { routing } from "@/i18n/routing";
import { getAllPostsMeta } from "@/lib/posts";
import { getAllProjectsMeta } from "@/lib/projects";
import { siteUrl } from "@/lib/site";

import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPostsMeta();
  const projects = getAllProjectsMeta();

  const postEntries = posts.flatMap((post) =>
    routing.locales.map((locale) => ({
      url: siteUrl(`/${locale}/posts/${post.slug}/`),
      lastModified: new Date(post.updated),
    })),
  );

  const projectEntries = projects.flatMap((project) =>
    routing.locales.map((locale) => ({
      url: siteUrl(`/${locale}/projects/${project.slug}/`),
      lastModified: new Date(project.date),
    })),
  );

  const staticPages = routing.locales.flatMap((locale) => [
    { url: siteUrl(`/${locale}/`), lastModified: new Date() },
    { url: siteUrl(`/${locale}/posts/`), lastModified: new Date() },
    { url: siteUrl(`/${locale}/projects/`), lastModified: new Date() },
    { url: siteUrl(`/${locale}/about/`), lastModified: new Date() },
  ]);

  return [...staticPages, ...postEntries, ...projectEntries];
}
