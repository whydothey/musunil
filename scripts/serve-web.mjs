import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "../apps/web");
const preferredPort = Number(process.env.PORT ?? 4173);

const { port } = await listen(preferredPort);
console.log(`musunil web listening on http://localhost:${port}`);

async function listen(port) {
  const server = createServer(handler);
  return new Promise((resolveListen, reject) => {
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" && port < preferredPort + 20) {
        resolveListen(listen(port + 1));
        return;
      }
      reject(error);
    });
    server.listen(port, () => resolveListen({ port, server }));
  });
}

async function handler(req, res) {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    if (pathname === "/config.js" && hasRuntimeWebConfigOverride()) {
      const body = `window.MUSUNIL_WEB_CONFIG = ${JSON.stringify(runtimeWebConfig(), null, 2)};\n`;
      res.writeHead(200, responseHeaders("text/javascript; charset=utf-8"));
      res.end(body);
      return;
    }
    const filePath = resolve(root, `.${pathname}`);
    if (!filePath.startsWith(`${root}${sep}`)) {
      res.writeHead(403, responseHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ error: "forbidden" }));
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, responseHeaders(contentType(filePath)));
    res.end(body);
  } catch {
    res.writeHead(404, responseHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({ error: "not_found" }));
  }
}

function hasRuntimeWebConfigOverride() {
  return Boolean(process.env.MUSUNIL_WEB_API_BASE_URL || process.env.MUSUNIL_WEB_MAP_STYLE_URL);
}

function runtimeWebConfig() {
  return {
    apiBaseUrl: publicUrl(process.env.MUSUNIL_WEB_API_BASE_URL, { allowLocal: true }) ?? "https://api.musunil.com",
    mapStyleUrl: publicUrl(process.env.MUSUNIL_WEB_MAP_STYLE_URL, { allowLocal: true }) ?? "https://tiles.openfreemap.org/styles/positron"
  };
}

function publicUrl(value, { allowLocal = false } = {}) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    const localHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(parsed.hostname);
    if (parsed.protocol === "https:") return parsed.toString().replace(/\/$/, "");
    if (allowLocal && parsed.protocol === "http:" && localHost) return parsed.toString().replace(/\/$/, "");
    return undefined;
  } catch {
    return undefined;
  }
}

function responseHeaders(type) {
  return {
    "cache-control": "no-store",
    "content-security-policy":
      "default-src 'self'; connect-src 'self' http://localhost:* http://127.0.0.1:* https:; img-src 'self' data: blob: http://localhost:* http://127.0.0.1:* https:; media-src 'self' blob: http://localhost:* http://127.0.0.1:* https:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.portone.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:",
    "content-type": type,
    "permissions-policy": "camera=(self), microphone=(), geolocation=(self)",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  };
}

function contentType(path) {
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mp4": "video/mp4",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8",
    ".webm": "video/webm",
    ".webp": "image/webp"
  }[extname(path)] ?? "application/octet-stream";
}
