import { getContentCatalog } from "@/lib/content-catalog";

import type { PostSearchIndex } from "@/lib/post-search";

export const dynamic = "force-static";

export async function GET() {
  const { posts } = await getContentCatalog();
  const index: PostSearchIndex = posts.map(({ slug, document }) => ({
    slug,
    blocks: document.searchBlocks,
  }));

  return Response.json(index);
}
