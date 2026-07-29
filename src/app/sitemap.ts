import { getContentCatalog } from "@/lib/content-catalog";
import { siteUrl } from "@/lib/site";

import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getContentCatalog();
  const postEntries = catalog.posts.map((post) => ({
    url: siteUrl(`/posts/${post.slug}/`),
    lastModified: new Date(post.updated),
  }));

  const projectEntries = catalog.projects.map((project) => ({
    url: siteUrl(`/projects/${project.slug}/`),
    lastModified: new Date(project.date),
  }));

  const staticPages = [
    { url: siteUrl("/"), lastModified: new Date() },
    { url: siteUrl("/posts/"), lastModified: new Date() },
    { url: siteUrl("/projects/"), lastModified: new Date() },
    { url: siteUrl("/about/"), lastModified: new Date() },
  ];

  return [...staticPages, ...postEntries, ...projectEntries];
}
