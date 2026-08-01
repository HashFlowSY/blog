import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { STABLE_POST, STABLE_PROJECT } from "./fixtures";
import { visitStaticPage } from "./helpers/static-page";
import {
  isMountedPath,
  isPublicOriginUrl,
  isStaticServerUrl,
  mapPublicUrlToStaticPreview,
  publicOrigin,
  publicUrl,
  routePath,
  staticBasePath,
  staticServerUrl,
} from "./static-artifact-config";

import type { Page, Response } from "@playwright/test";

const criticalResourceTypes = new Set([
  "font",
  "image",
  "script",
  "stylesheet",
]);

interface ReferenceCandidate {
  attribute: "href" | "src" | "srcset";
  tagName: string;
  value: string;
}

interface ResourceObservation {
  contentType: string | undefined;
  status: number;
  type: string;
  url: string;
}

interface ExpectedPageMetadata {
  description: string;
  robots: "indexable" | "noindex";
  title: string;
}

interface ExpectedDetailMetadata {
  description: string;
  heading: string;
  pathname: string;
  title: string;
}

const defaultDescription =
  "Hashflow 的个人作品站：记录 AI 应用、后端系统、自动化交付和长期写作。";

const staticPageMetadata = {
  "/": {
    description: defaultDescription,
    robots: "indexable",
    title: "Hashflow｜AI 全栈工程师",
  },
  "/about/": {
    description: "Hashflow 的工程经历、能力边界与求职、项目合作入口。",
    robots: "indexable",
    title: "关于我 | Hashflow",
  },
  "/posts/": {
    description: "记录 AI 工具、工程实现、技术取舍与复盘。",
    robots: "indexable",
    title: "技术写作 | Hashflow",
  },
  "/projects/": {
    description: "Hashflow 的项目案例：问题、角色、关键决策、实现过程与结果。",
    robots: "indexable",
    title: "项目案例 | Hashflow",
  },
} as const satisfies Record<string, ExpectedPageMetadata>;

const stableDetailMetadata = {
  post: {
    description: STABLE_POST.description,
    heading: STABLE_POST.title,
    pathname: `/posts/${STABLE_POST.slug}/`,
    title: `${STABLE_POST.title} | Hashflow`,
  },
  project: {
    description: STABLE_PROJECT.description,
    heading: STABLE_PROJECT.title,
    pathname: `/projects/${STABLE_PROJECT.slug}/`,
    title: `${STABLE_PROJECT.title} | Hashflow`,
  },
} as const satisfies Record<"post" | "project", ExpectedDetailMetadata>;

async function expectCanonical(page: Page, pathname: string): Promise<void> {
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    publicUrl(pathname),
  );
}

async function expectPageMetadata(
  page: Page,
  expected: ExpectedPageMetadata,
): Promise<void> {
  await expect(page).toHaveTitle(expected.title);
  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveCount(1);
  await expect(description).toHaveAttribute("content", expected.description);

  const robots = await page
    .locator('meta[name="robots"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("content") ?? ""),
    );

  if (expected.robots === "noindex") {
    expect(robots, "The 404 document must opt out of indexing").toContain(
      "noindex, follow",
    );
    return;
  }

  expect(
    robots.some((content) => /\bnoindex\b/i.test(content)),
    "Published pages must remain indexable",
  ).toBe(false);
}

async function expectPublishedDetailMetadata(
  page: Page,
  expected: ExpectedDetailMetadata,
): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    expected.heading,
  );
  await expect(page.locator(".portfolio-lede")).toHaveText(
    expected.description,
  );
  await expectPageMetadata(page, {
    description: expected.description,
    robots: "indexable",
    title: expected.title,
  });
}

function parseSrcsetCandidates(srcset: string): string[] {
  const candidates: string[] = [];
  let position = 0;

  while (position < srcset.length) {
    while (
      position < srcset.length &&
      (/[\t\n\f\r ]/.test(srcset.charAt(position)) ||
        srcset.charAt(position) === ",")
    ) {
      position += 1;
    }

    const urlStart = position;
    while (
      position < srcset.length &&
      !/[\t\n\f\r ]/.test(srcset.charAt(position))
    ) {
      position += 1;
    }

    let url = srcset.slice(urlStart, position);
    if (url.endsWith(",")) {
      url = url.replace(/,+$/, "");
      if (url) candidates.push(url);
      continue;
    }

    if (url) candidates.push(url);

    while (position < srcset.length && srcset.charAt(position) !== ",") {
      position += 1;
    }
    if (srcset.charAt(position) === ",") position += 1;
  }

  return candidates;
}

async function collectReferenceCandidates(
  page: Page,
): Promise<ReferenceCandidate[]> {
  const references = await page
    .locator("[href], [src], [srcset]")
    .evaluateAll((elements) =>
      elements.flatMap((element) =>
        (["href", "src", "srcset"] as const).flatMap((attribute) => {
          const value = element.getAttribute(attribute)?.trim();
          if (!value) return [];

          return [
            {
              attribute,
              tagName: element.tagName.toLowerCase(),
              value,
            },
          ];
        }),
      ),
    );

  return references.flatMap((reference) => {
    if (reference.attribute !== "srcset") return [reference];

    return parseSrcsetCandidates(reference.value).map((value) => ({
      ...reference,
      value,
    }));
  });
}

function isDocumentRelativeReference(value: string): boolean {
  return (
    !value.startsWith("/") &&
    !value.startsWith("#") &&
    !value.startsWith("?") &&
    !hasUrlScheme(value)
  );
}

function hasUrlScheme(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(value);
}

function isNonHttpScheme(value: string): boolean {
  return hasUrlScheme(value) && !/^https?:/i.test(value);
}

function isSameOriginReference(url: URL): boolean {
  return url.origin === staticServerUrl.origin || url.origin === publicOrigin;
}

async function expectBasePathReferences(page: Page): Promise<void> {
  const references = await collectReferenceCandidates(page);
  expect(
    references,
    "Expected the generated page to reference local files",
  ).not.toEqual([]);

  const protocolRelativeReferences = references.filter(({ value }) =>
    value.startsWith("//"),
  );
  expect(
    protocolRelativeReferences,
    "Generated references must use an explicit scheme or a base-path-aware URL",
  ).toEqual([]);

  const invalidReferences = references.filter(({ value }) => {
    if (value.startsWith("#") || isNonHttpScheme(value)) {
      return false;
    }

    try {
      new URL(value, page.url());
      return false;
    } catch {
      return true;
    }
  });
  expect(invalidReferences, "Generated references must be valid URLs").toEqual(
    [],
  );

  const documentRelativeReferences = references.filter(({ value }) =>
    isDocumentRelativeReference(value),
  );
  const sameOriginReferences = references.flatMap((reference) => {
    if (
      reference.value.startsWith("#") ||
      reference.value.startsWith("//") ||
      isNonHttpScheme(reference.value)
    ) {
      return [];
    }

    const url = new URL(reference.value, page.url());
    return isSameOriginReference(url) ? [{ ...reference, url }] : [];
  });
  expect(
    sameOriginReferences,
    "Expected the generated page to reference local files",
  ).not.toEqual([]);

  if (staticBasePath === "") return;

  const missingBasePath = sameOriginReferences.filter(
    ({ url }) => !isMountedPath(url.pathname),
  );
  const duplicateBasePath = sameOriginReferences.filter(({ url }) =>
    url.pathname.startsWith(`${staticBasePath}${staticBasePath}/`),
  );

  expect(
    missingBasePath,
    "Every local reference must use the base path",
  ).toEqual([]);
  expect(
    duplicateBasePath,
    "References must not duplicate the base path",
  ).toEqual([]);
  expect(
    documentRelativeReferences,
    "Generated local references must not rely on the current document path",
  ).toEqual([]);
}

async function extractXmlUrls(
  page: Page,
  xml: string,
  tagName: "link" | "loc",
): Promise<string[]> {
  return page.evaluate(
    ({ documentText, elementName }) => {
      const document = new DOMParser().parseFromString(
        documentText,
        "application/xml",
      );
      if (document.querySelector("parsererror")) {
        throw new Error(`Unable to parse XML ${elementName} values`);
      }

      return Array.from(document.getElementsByTagName(elementName), (element) =>
        element.textContent?.trim(),
      ).filter((url): url is string => Boolean(url));
    },
    { documentText: xml, elementName: tagName },
  );
}

function expectPublicUrlsUseBasePath(urls: string[], source: string): void {
  expect(urls, `${source} must expose public URLs`).not.toEqual([]);

  const invalidUrls = urls.filter((url) => {
    try {
      const parsed = new URL(url);
      return (
        parsed.origin !== publicOrigin ||
        !isMountedPath(parsed.pathname) ||
        (staticBasePath !== "" &&
          parsed.pathname.startsWith(`${staticBasePath}${staticBasePath}/`))
      );
    } catch {
      return true;
    }
  });

  expect(
    invalidUrls,
    `${source} URLs must use the public origin and deployment base path`,
  ).toEqual([]);
}

async function visitStableDetail(
  page: Page,
  collection: "post" | "project",
): Promise<void> {
  const detail = stableDetailMetadata[collection];
  await visitStaticPage(page, detail.pathname);
}

function recordCriticalResources(
  page: Page,
  observations: ResourceObservation[],
  failures: string[],
): void {
  page.on("response", (response: Response) => {
    const type = response.request().resourceType();
    if (
      !criticalResourceTypes.has(type) ||
      (!isStaticServerUrl(response.url()) && !isPublicOriginUrl(response.url()))
    ) {
      return;
    }

    observations.push({
      contentType: response.headers()["content-type"],
      status: response.status(),
      type,
      url: response.url(),
    });
  });
  page.on("requestfailed", (request) => {
    const type = request.resourceType();
    if (
      !criticalResourceTypes.has(type) ||
      (!isStaticServerUrl(request.url()) && !isPublicOriginUrl(request.url()))
    ) {
      return;
    }

    failures.push(
      `${type} ${request.url()} (${request.failure()?.errorText ?? "unknown"})`,
    );
  });
}

async function mapPublicResourcesToStaticPreview(page: Page): Promise<void> {
  await page.route(`${publicOrigin}/**`, async (route) => {
    const request = route.request();
    if (
      !criticalResourceTypes.has(request.resourceType()) ||
      request.method() !== "GET"
    ) {
      await route.fallback();
      return;
    }

    const response = await page.request.get(
      mapPublicUrlToStaticPreview(request.url()),
    );
    await route.fulfill({ response });
  });
}

async function requestImage(page: Page, url: string): Promise<Response> {
  const response = page.waitForResponse((candidate) => candidate.url() === url);
  await page.evaluate((source) => {
    const image = document.createElement("img");
    image.alt = "";
    image.src = source;
    document.body.append(image);
  }, url);

  return response;
}

test.describe("generated static artifact", () => {
  test("serves representative pages and their critical resources from the configured base path", async ({
    page,
  }) => {
    const observations: ResourceObservation[] = [];
    const failures: string[] = [];
    await mapPublicResourcesToStaticPreview(page);
    recordCriticalResources(page, observations, failures);

    for (const pathname of ["/", "/posts/", "/projects/", "/about/"] as const) {
      await visitStaticPage(page, pathname);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectBasePathReferences(page);
      await expectCanonical(page, pathname);
      await expectPageMetadata(page, staticPageMetadata[pathname]);
    }

    await visitStableDetail(page, "post");
    await expectBasePathReferences(page);
    await expectCanonical(page, stableDetailMetadata.post.pathname);
    await expectPublishedDetailMetadata(page, stableDetailMetadata.post);

    await visitStableDetail(page, "project");
    await expectBasePathReferences(page);
    await expectCanonical(page, stableDetailMetadata.project.pathname);
    await expectPublishedDetailMetadata(page, stableDetailMetadata.project);

    const projectText = (await page.locator("body").innerText()).toLowerCase();
    expect(projectText).not.toContain("template case");
    expect(projectText).not.toContain("示例项目");

    expect(new URL(page.url()).pathname).toContain(staticBasePath || "/");
    expect(failures, "Critical static resources must not fail to load").toEqual(
      [],
    );
    expect(
      observations.filter(({ status }) => status >= 400),
      "Critical static resources must return successful responses",
    ).toEqual([]);
    expect(
      observations.filter(({ url }) => !isMountedPath(new URL(url).pathname)),
      "Critical resource requests must include the deployment base path",
    ).toEqual([]);
    const scripts = observations.filter(({ type }) => type === "script");
    const stylesheets = observations.filter(
      ({ type }) => type === "stylesheet",
    );
    const images = observations.filter(({ type }) => type === "image");

    expect(scripts).not.toEqual([]);
    expect(stylesheets).not.toEqual([]);
    expect(images).not.toEqual([]);
    expect(
      scripts.every(({ contentType }) =>
        /(?:application|text)\/javascript/.test(contentType ?? ""),
      ),
      "Scripts must have a JavaScript MIME type",
    ).toBe(true);
    expect(
      stylesheets.every(({ contentType }) =>
        /text\/css/.test(contentType ?? ""),
      ),
      "Stylesheets must have a CSS MIME type",
    ).toBe(true);
    expect(
      images.every(({ contentType }) => /image\//.test(contentType ?? "")),
      "Images must have an image MIME type",
    ).toBe(true);
  });

  test("maps production-origin critical resources to the local static preview", async ({
    page,
  }) => {
    const observations: ResourceObservation[] = [];
    const failures: string[] = [];
    recordCriticalResources(page, observations, failures);
    await mapPublicResourcesToStaticPreview(page);
    await visitStaticPage(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const existingImage = publicUrl("/assets/workbench-hero.png");
    const existingResponse = await requestImage(page, existingImage);
    expect(existingResponse.status()).toBe(200);
    expect(existingResponse.headers()["content-type"]).toMatch(/image\/png/);

    const missingImage = publicUrl("/assets/missing-static-resource.png");
    const missingResponse = await requestImage(page, missingImage);
    expect(missingResponse.status()).toBe(404);
    expect(
      observations,
      "Production-origin resources must be observed after local preview mapping",
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 200,
          type: "image",
          url: existingImage,
        }),
        expect.objectContaining({
          status: 404,
          type: "image",
          url: missingImage,
        }),
      ]),
    );
    expect(failures).toEqual([]);
  });

  test("publishes base-path-aware canonical URLs, feed, sitemap, and robots", async ({
    page,
  }) => {
    await visitStaticPage(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectCanonical(page, "/");

    await visitStableDetail(page, "post");
    await visitStableDetail(page, "project");

    await visitStaticPage(page, "/about/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("contentinfo").getByRole("link", {
        name: "GitHub / HashFlowSY",
      }),
    ).toHaveAttribute("href", "https://github.com/HashFlowSY");

    const visibleText = (await page.locator("body").innerText()).toLowerCase();
    expect(visibleText).not.toContain("hello@example.com");
    expect(visibleText).not.toContain("later replace");
    expect(visibleText).not.toContain("template case");

    const feed = await page.request.get(routePath("/feed.xml"));
    expect(feed.status()).toBe(200);
    expect(feed.headers()["content-type"]).toMatch(/application\/xml/);
    const feedUrls = await extractXmlUrls(page, await feed.text(), "link");
    expectPublicUrlsUseBasePath(feedUrls, "RSS <link>");
    expect(feedUrls).toContain(publicUrl(stableDetailMetadata.post.pathname));

    const sitemap = await page.request.get(routePath("/sitemap.xml"));
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()["content-type"]).toMatch(/application\/xml/);
    const sitemapUrls = await extractXmlUrls(page, await sitemap.text(), "loc");
    expectPublicUrlsUseBasePath(sitemapUrls, "Sitemap <loc>");
    expect(sitemapUrls).toContain(
      publicUrl(stableDetailMetadata.post.pathname),
    );
    expect(sitemapUrls).toContain(
      publicUrl(stableDetailMetadata.project.pathname),
    );

    const robots = await page.request.get(routePath("/robots.txt"));
    expect(robots.status()).toBe(200);
    expect(robots.headers()["content-type"]).toMatch(/text\/plain/);
    const robotsSitemaps = Array.from(
      (await robots.text()).matchAll(/^Sitemap:\s*(\S+)$/gim),
      (match) => match[1] ?? "",
    );
    expectPublicUrlsUseBasePath(robotsSitemaps, "robots sitemap");
    expect(robotsSitemaps).toEqual([publicUrl("/sitemap.xml")]);
  });

  test("serves the generated 404 document without a SPA fallback", async ({
    page,
  }) => {
    const generated404 = await readFile(path.resolve("out", "404.html"));
    expect(generated404.byteLength).toBeGreaterThan(0);

    const missingContentRoutes = [
      "/posts/no-such-published-post/",
      "/projects/no-such-project-case/",
    ] as const;
    for (const pathname of missingContentRoutes) {
      const missingContentResponse = await page.request.get(
        routePath(pathname),
      );
      expect(missingContentResponse.status(), pathname).toBe(404);
      expect(await missingContentResponse.body(), pathname).toEqual(
        generated404,
      );

      await visitStaticPage(page, pathname, { expectedStatus: 404 });
      await expect(
        page.getByRole("heading", { name: "页面不存在" }),
      ).toBeVisible();
      await expect(page.locator("main .portfolio-article-page")).toHaveCount(0);
      await expect(page.locator("main .portfolio-project-detail")).toHaveCount(
        0,
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
      await expectBasePathReferences(page);
    }

    const missingPath = "/does-not-exist/";
    const response = await page.request.get(routePath(missingPath));

    expect(response.status()).toBe(404);
    expect(await response.body()).toEqual(generated404);

    await visitStaticPage(page, missingPath, { expectedStatus: 404 });
    await expect(
      page.getByRole("heading", { name: "页面不存在" }),
    ).toBeVisible();
    await expect(page.getByText("404 / missing signal")).toBeVisible();
    await expect(page.locator("main .portfolio-article-page")).toHaveCount(0);
    await expect(page.locator("main .portfolio-project-detail")).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expectPageMetadata(page, {
      description: defaultDescription,
      robots: "noindex",
      title: "Hashflow｜AI 全栈工程师",
    });
    await expectBasePathReferences(page);
  });
});
