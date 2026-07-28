export const BASE_URL = process.env["NEXT_PUBLIC_SITE_URL"];
// Client components only receive NEXT_PUBLIC_* variables at build time.
export const BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH ?? process.env["BASE_PATH"];

export function assetPath(path: string): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBasePath = (BASE_PATH ?? "").replace(/\/+$/, "");

  if (
    !normalizedBasePath ||
    normalizedPath === normalizedBasePath ||
    normalizedPath.startsWith(`${normalizedBasePath}/`)
  ) {
    return normalizedPath;
  }

  return `${normalizedBasePath}${normalizedPath}`;
}

export function siteUrl(path: string): string {
  if (!BASE_URL) return path;
  return `${BASE_URL}${BASE_PATH ?? ""}${path}`;
}
