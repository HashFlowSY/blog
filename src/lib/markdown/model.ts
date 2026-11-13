import type { Root } from "hast";

export interface MarkdownSource {
  readonly filePath: string;
  readonly bodyLine: number;
  readonly title: string;
  readonly body: string;
}

export interface DocumentHeading {
  readonly id: string;
  readonly level: 1 | 2 | 3;
  readonly text: string;
}

export interface ReadingStats {
  readonly cjkCharacters: number;
  readonly otherWords: number;
  readonly minutes: number;
}

export interface CompiledDocument {
  readonly tree: Root;
  readonly outline: readonly DocumentHeading[];
  readonly searchBlocks: readonly string[];
  readonly readingStats: ReadingStats;
}

interface CodeFence {
  readonly source: string;
  readonly language: string | null;
  readonly meta: string | null;
}

interface CodeFrame {
  readonly source: string;
  readonly label: string;
}

declare module "hast" {
  interface ElementData {
    fence?: CodeFence;
    codeFrame?: CodeFrame;
  }
}

export function markdownError(
  source: MarkdownSource,
  point: { line: number; column: number } | undefined,
  reason: string,
): Error {
  const line = source.bodyLine + (point?.line ?? 1) - 1;
  return new Error(
    `${source.filePath}:${line}:${point?.column ?? 1}: ${reason}`,
  );
}

export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/gu, " ");
}
