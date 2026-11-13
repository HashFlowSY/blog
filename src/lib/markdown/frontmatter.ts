import { VFile } from "vfile";
import { matter } from "vfile-matter";

export function readMarkdownSource(filePath: string, bytes: Uint8Array) {
  const file = new VFile({ path: filePath, value: bytes });
  const source = String(file);
  try {
    matter(file, {
      strip: true,
      yaml: { schema: "core", version: "1.2", uniqueKeys: true },
    });
  } catch (error: unknown) {
    const position =
      error instanceof Error &&
      "linePos" in error &&
      Array.isArray(error.linePos)
        ? (error.linePos[0] as { line: number; col: number } | undefined)
        : undefined;
    const line = (position?.line ?? 1) + 1;
    const column = position?.col ?? 1;
    const reason =
      error instanceof Error ? error.message.split("\n")[0] : String(error);
    throw new Error(
      `line ${line}, column ${column}: Invalid YAML frontmatter. ${reason}`,
    );
  }

  const body = String(file);
  if (body === source) {
    throw new Error("line 1: Expected YAML frontmatter enclosed in --- lines.");
  }
  const frontmatter = file.data["matter"];
  if (
    typeof frontmatter !== "object" ||
    frontmatter === null ||
    Array.isArray(frontmatter)
  ) {
    throw new Error("line 2: YAML frontmatter must be a mapping.");
  }
  const removed = source.slice(0, source.length - body.length);
  return {
    filePath,
    frontmatter,
    body,
    bodyLine: removed.split(/\r\n|\r|\n/u).length,
  };
}
