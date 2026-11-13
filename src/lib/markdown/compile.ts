import { analyzeDocument } from "./analyze";
import { highlightDocuments } from "./highlight";
import { bindDocumentLinks } from "./links";
import { readBodyTree } from "./semantics";

import type { CompiledDocument, MarkdownSource } from "./model";

function freezeTree(value: unknown): void {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return;
  for (const child of Object.values(value)) freezeTree(child);
  Object.freeze(value);
}

export async function compileMarkdownDocuments(
  sources: readonly MarkdownSource[],
  { basePath }: { readonly basePath: string },
): Promise<ReadonlyMap<string, CompiledDocument>> {
  const documents = [];
  for (const source of sources) {
    const tree = await readBodyTree(source);
    bindDocumentLinks(tree, source, basePath);
    documents.push({ source, tree, analysis: analyzeDocument(tree) });
  }

  await highlightDocuments(documents);
  return new Map(
    documents.map(({ source, tree, analysis }) => {
      const document = { tree, ...analysis };
      freezeTree(document);
      return [source.filePath, document];
    }),
  );
}
