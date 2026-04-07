export const BASE_URL = process.env["NEXT_PUBLIC_SITE_URL"];
export const BASE_PATH = process.env["BASE_PATH"];

export function siteUrl(path: string): string {
  return `${BASE_URL}${BASE_PATH}${path}`;
}
