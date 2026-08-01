export const URL_PATH_NORMALIZATION_BASE = "https://site.invalid";

export function parseUrlReference(value: string, base?: string | URL): URL {
  return new URL(value, base ?? URL_PATH_NORMALIZATION_BASE);
}

function isRootRelativePathname(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

function isEncodedDotSegment(segment: string): boolean {
  const dots = segment.replace(/%2e/gi, ".");
  return dots === "." || dots === "..";
}

function containsEncodedPathSeparator(value: string): boolean {
  return /%2f|%5c/i.test(value);
}

export function normalizeRootRelativePathname(value: string): string | null {
  if (!isRootRelativePathname(value)) {
    return null;
  }

  const url = parseUrlReference(value);
  if (
    url.origin !== URL_PATH_NORMALIZATION_BASE ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    return null;
  }

  return url.pathname;
}

export function decodeCanonicalRootRelativePathname(
  value: string,
): string | null {
  const pathname = normalizeRootRelativePathname(value);
  if (pathname !== value) {
    return null;
  }

  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (
    decodedPathname.includes("\\") ||
    containsEncodedPathSeparator(pathname) ||
    containsEncodedPathSeparator(decodedPathname) ||
    decodedPathname.split("/").some(isEncodedDotSegment)
  ) {
    return null;
  }

  return decodedPathname;
}
