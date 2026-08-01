import { parseUrlReference, URL_PATH_NORMALIZATION_BASE } from "./url-path";

const SITE_NAME = "Hashflow";
const SITE_ROLE = "AI 全栈工程师";
const GITHUB_HANDLE = "HashFlowSY";

export const SITE = {
  name: SITE_NAME,
  role: SITE_ROLE,
  title: `${SITE_NAME}｜${SITE_ROLE}`,
  description: `${SITE_NAME} 的个人作品站：记录 AI 应用、后端系统、自动化交付和长期写作。`,
  githubProfile: {
    label: `GitHub / ${GITHUB_HANDLE}`,
    url: `https://github.com/${GITHUB_HANDLE}`,
  },
} as const;

function invalidConfiguration(name: string, value: string): never {
  throw new Error(`Invalid ${name}: ${JSON.stringify(value)}`);
}

function isLocalhost(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

function validateSiteOrigin(value: string | undefined): string | undefined {
  if (value === undefined) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error("NEXT_PUBLIC_SITE_URL is required in production");
    }

    return undefined;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalidConfiguration("NEXT_PUBLIC_SITE_URL", value);
  }

  const isLocalDevelopmentOrigin =
    process.env["NODE_ENV"] !== "production" &&
    url.protocol === "http:" &&
    isLocalhost(url.hostname);
  const isValidProtocol = url.protocol === "https:" || isLocalDevelopmentOrigin;

  if (!isValidProtocol || value !== url.origin) {
    return invalidConfiguration("NEXT_PUBLIC_SITE_URL", value);
  }

  return url.origin;
}

function validateBasePath(
  name: "BASE_PATH" | "NEXT_PUBLIC_BASE_PATH",
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  if (value === "") return "";

  let url: URL;
  try {
    url = parseUrlReference(value);
  } catch {
    return invalidConfiguration(name, value);
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.endsWith("/") ||
    value.includes("//") ||
    value.includes("?") ||
    value.includes("#") ||
    url.origin !== URL_PATH_NORMALIZATION_BASE ||
    url.pathname !== value
  ) {
    return invalidConfiguration(name, value);
  }

  return url.pathname;
}

function readBasePath(): string {
  const basePath = validateBasePath("BASE_PATH", process.env["BASE_PATH"]);
  const publicBasePath = validateBasePath(
    "NEXT_PUBLIC_BASE_PATH",
    process.env["NEXT_PUBLIC_BASE_PATH"],
  );

  if (
    basePath !== undefined &&
    publicBasePath !== undefined &&
    basePath !== publicBasePath
  ) {
    throw new Error("BASE_PATH and NEXT_PUBLIC_BASE_PATH must match");
  }

  return publicBasePath ?? basePath ?? "";
}

export const SITE_ORIGIN = validateSiteOrigin(
  process.env["NEXT_PUBLIC_SITE_URL"],
);
export const BASE_URL = SITE_ORIGIN;
export const BASE_PATH = readBasePath();

function requireRootRelativePath(path: string): void {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Expected a root-relative path beginning with '/'");
  }
}

function getRootRelativeReference(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}`;
}

function withBasePath(path: string): string {
  const pathUrl = parseUrlReference(path);
  const rootRelativePath = getRootRelativeReference(pathUrl);

  if (!BASE_PATH) return rootRelativePath;

  const baseUrl = parseUrlReference(`${BASE_PATH}/`);
  return getRootRelativeReference(
    parseUrlReference(rootRelativePath.slice(1), baseUrl),
  );
}

function isExternalUrl(path: string): boolean {
  return parseUrlReference(path).origin !== URL_PATH_NORMALIZATION_BASE;
}

export function assetPath(path: string): string {
  if (isExternalUrl(path)) return path;

  return withBasePath(path.startsWith("/") ? path : `/${path}`);
}

export function siteUrl(path: string): string {
  requireRootRelativePath(path);
  const pathWithBase = withBasePath(path);

  if (!SITE_ORIGIN) return pathWithBase;
  return new URL(pathWithBase, SITE_ORIGIN).toString();
}
