export function readingProgress(
  body: Pick<DOMRectReadOnly, "top" | "bottom">,
  readingTop: number,
  readingBottom: number,
): number {
  if (body.bottom <= readingBottom + 1) return 1;
  if (body.top >= readingTop) return 0;

  const travel = body.bottom - body.top - (readingBottom - readingTop);
  return (readingTop - body.top) / travel;
}
