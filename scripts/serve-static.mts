import { createReadStream, promises as fs } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

import type { IncomingMessage, ServerResponse } from "node:http";

const requiredArtifacts = [
  "404.html",
  "feed.xml",
  "index.html",
  "robots.txt",
  "sitemap.xml",
] as const;

const mimeTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

interface StaticFile {
  path: string;
  size: number;
}

interface Redirect {
  location: string;
}

function readPort(value: string | undefined): number {
  if (value === undefined) return 4173;

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT: ${JSON.stringify(value)}`);
  }

  return port;
}

function readBasePath(value: string | undefined): string {
  if (value === undefined) return "/blog";
  if (value === "") return "";

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.endsWith("/") ||
    value.includes("//") ||
    value.includes("?") ||
    value.includes("#")
  ) {
    throw new Error(`Invalid STATIC_BASE_PATH: ${JSON.stringify(value)}`);
  }

  return value;
}

function isInsideDirectory(directory: string, candidate: string): boolean {
  const relative = path.relative(directory, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function contentType(filePath: string): string {
  return (
    mimeTypes[path.extname(filePath).toLowerCase()] ??
    "application/octet-stream"
  );
}

function sendPlainText(
  response: ServerResponse,
  statusCode: number,
  message: string,
): void {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(message),
  });
  response.end(message);
}

async function resolveStaticFile(
  artifactRoot: string,
  candidatePath: string,
): Promise<StaticFile | undefined> {
  const resolvedPath = path.resolve(candidatePath);
  if (!isInsideDirectory(artifactRoot, resolvedPath)) return undefined;

  try {
    const [stats, realPath] = await Promise.all([
      fs.stat(resolvedPath),
      fs.realpath(resolvedPath),
    ]);
    if (!stats.isFile() || !isInsideDirectory(artifactRoot, realPath)) {
      return undefined;
    }

    return { path: realPath, size: stats.size };
  } catch {
    return undefined;
  }
}

async function resolveRequest(
  artifactRoot: string,
  basePath: string,
  requestUrl: URL,
): Promise<Redirect | StaticFile | undefined> {
  let pathname: string;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    return undefined;
  }

  let artifactPath: string;
  if (basePath === "") {
    artifactPath = pathname;
  } else if (pathname === basePath) {
    return { location: `${basePath}/${requestUrl.search}` };
  } else if (pathname.startsWith(`${basePath}/`)) {
    artifactPath = pathname.slice(basePath.length);
  } else {
    return undefined;
  }

  const candidatePath = path.resolve(artifactRoot, `.${artifactPath}`);
  if (!isInsideDirectory(artifactRoot, candidatePath)) return undefined;

  try {
    const stats = await fs.stat(candidatePath);
    if (stats.isDirectory()) {
      if (!pathname.endsWith("/")) {
        return { location: `${pathname}/${requestUrl.search}` };
      }

      return resolveStaticFile(
        artifactRoot,
        path.join(candidatePath, "index.html"),
      );
    }
  } catch {
    return undefined;
  }

  return resolveStaticFile(artifactRoot, candidatePath);
}

function isRedirect(result: Redirect | StaticFile): result is Redirect {
  return "location" in result;
}

function sendFile(
  request: IncomingMessage,
  response: ServerResponse,
  file: StaticFile,
  statusCode = 200,
): void {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Length": file.size,
    "Content-Type": contentType(file.path),
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  const stream = createReadStream(file.path);
  stream.once("error", (error) => {
    if (!response.headersSent) {
      sendPlainText(response, 500, "Unable to read static artifact");
      return;
    }

    response.destroy(error);
  });
  stream.pipe(response);
}

async function startServer(): Promise<void> {
  const configuredOutput = path.resolve(process.cwd(), "out");
  const artifactRoot = await fs.realpath(configuredOutput);
  const rootStats = await fs.stat(artifactRoot);
  if (!rootStats.isDirectory()) {
    throw new Error(`Static artifact is not a directory: ${configuredOutput}`);
  }

  const requiredFiles = await Promise.all(
    requiredArtifacts.map((artifact) =>
      resolveStaticFile(artifactRoot, path.join(artifactRoot, artifact)),
    ),
  );
  const missingArtifact = requiredArtifacts.find(
    (_, index) => requiredFiles[index] === undefined,
  );
  if (missingArtifact) {
    throw new Error(
      `Static artifact is incomplete: missing out/${missingArtifact}. Build before starting the preview server.`,
    );
  }

  const basePath = readBasePath(process.env["STATIC_BASE_PATH"]);
  const host = process.env["HOST"] ?? "127.0.0.1";
  const port = readPort(process.env["PORT"]);
  const notFoundFile = requiredFiles[0];
  if (!notFoundFile) {
    throw new Error("Static artifact is incomplete: missing out/404.html");
  }

  const server = createServer((request, response) => {
    void (async () => {
      if (request.method !== "GET" && request.method !== "HEAD") {
        sendPlainText(response, 405, "Method not allowed");
        return;
      }

      const requestUrl = new URL(
        request.url ?? "/",
        `http://${request.headers.host ?? `${host}:${port}`}`,
      );
      const result = await resolveRequest(artifactRoot, basePath, requestUrl);

      if (!result) {
        sendFile(request, response, notFoundFile, 404);
        return;
      }

      if (isRedirect(result)) {
        response.writeHead(308, { Location: result.location });
        response.end();
        return;
      }

      sendFile(request, response, result);
    })().catch((error: unknown) => {
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : undefined);
        return;
      }

      sendPlainText(response, 500, "Unable to serve static artifact");
      console.error(error);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const previewPath = basePath || "/";
  process.stdout.write(
    `Serving ${artifactRoot} at http://${host}:${port}${previewPath}\n`,
  );

  let closing = false;
  const closeServer = () => {
    if (closing) return;
    closing = true;
    server.close((error) => {
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGINT", closeServer);
  process.once("SIGTERM", closeServer);
}

void startServer().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
