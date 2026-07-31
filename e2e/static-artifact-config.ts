const DEFAULT_STATIC_BASE_URL = "http://127.0.0.1:4173/blog/";

export const staticBaseURL =
  process.env["PLAYWRIGHT_STATIC_BASE_URL"] ?? DEFAULT_STATIC_BASE_URL;
export const staticServerUrl = new URL(staticBaseURL);
export const staticBasePath = staticServerUrl.pathname.replace(/\/$/, "");
export const publicOrigin = new URL(
  process.env["PLAYWRIGHT_PUBLIC_ORIGIN"] ?? "https://example.com",
).origin;

const configuredBasePath = process.env["STATIC_BASE_PATH"];

if (staticServerUrl.protocol !== "http:") {
  throw new Error("PLAYWRIGHT_STATIC_BASE_URL must use http");
}

if (!staticServerUrl.port) {
  throw new Error("PLAYWRIGHT_STATIC_BASE_URL must include a port");
}

if (configuredBasePath !== undefined && configuredBasePath !== staticBasePath) {
  throw new Error(
    "STATIC_BASE_PATH must match the path in PLAYWRIGHT_STATIC_BASE_URL",
  );
}

export function routePath(pathname: string): string {
  if (!pathname.startsWith("/")) {
    throw new Error(`Expected a root-relative route, received ${pathname}`);
  }

  return `${staticBasePath}${pathname}`;
}

export function publicUrl(pathname: string): string {
  return new URL(routePath(pathname), `${publicOrigin}/`).toString();
}

export function isMountedPath(pathname: string): boolean {
  return (
    staticBasePath === "" ||
    pathname === staticBasePath ||
    pathname.startsWith(`${staticBasePath}/`)
  );
}

export function isStaticServerUrl(url: string): boolean {
  return new URL(url).origin === staticServerUrl.origin;
}

export function isPublicOriginUrl(url: string): boolean {
  return new URL(url).origin === publicOrigin;
}

export function mapPublicUrlToStaticPreview(url: string): string {
  const publicUrl = new URL(url);
  if (publicUrl.origin !== publicOrigin) {
    throw new Error(`Expected a ${publicOrigin} URL, received ${url}`);
  }

  return new URL(
    `${publicUrl.pathname}${publicUrl.search}`,
    staticServerUrl.origin,
  ).toString();
}
