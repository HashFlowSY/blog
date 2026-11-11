export type ContentCollection = "posts" | "projects";

export function collectionCardId(collection: ContentCollection, slug: string) {
  return `${collection}-${slug}`;
}

export function articleFilterSearch(query: string, topic: string | null) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (topic) params.set("topic", topic);
  const search = params.toString();
  return search ? `?${search}` : "";
}
