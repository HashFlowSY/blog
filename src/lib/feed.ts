interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  categories: string[];
}

interface FeedConfig {
  title: string;
  link: string;
  description: string;
  language: string;
  items: readonly FeedItem[];
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function toRfc822(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toUTCString();
}

export function buildRssXml(config: FeedConfig): string {
  const { title, link, description, language, items } = config;

  const lastBuildDate =
    items.length > 0
      ? toRfc822(
          items.reduce((latest, item) =>
            item.pubDate > latest.pubDate ? item : latest,
          ).pubDate,
        )
      : toRfc822(new Date().toISOString().slice(0, 10));

  const itemElements = items
    .map((item) => {
      const categories = item.categories
        .map((cat) => `    <category>${escapeXml(cat)}</category>`)
        .join("\n");

      return [
        "  <item>",
        `    <title>${escapeXml(item.title)}</title>`,
        `    <link>${escapeXml(item.link)}</link>`,
        `    <description>${escapeXml(item.description)}</description>`,
        `    <pubDate>${toRfc822(item.pubDate)}</pubDate>`,
        categories,
        "  </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(link)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    `    <language>${escapeXml(language)}</language>`,
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    itemElements,
    "  </channel>",
    "</rss>",
  ].join("\n");
}
