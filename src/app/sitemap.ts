import { getAllPostsMeta } from "@/lib/posts";
import { getAllProjectsMeta } from "@/lib/projects";
import { siteUrl } from "@/lib/site";

import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const postEntries = getAllPostsMeta().map((post) => ({
    url: siteUrl(`/posts/${post.slug}/`),
    lastModified: new Date(post.updated),
  }));

  const projectEntries = getAllProjectsMeta().map((project) => ({
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
