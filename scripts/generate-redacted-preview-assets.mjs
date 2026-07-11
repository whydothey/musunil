import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const outDir = resolve(import.meta.dirname, "../apps/web/media/redacted");
const width = 960;
const height = 540;
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

await mkdir(outDir, { recursive: true });

for (const scene of [
  { file: "preview-occ-live-1-poster.png", seed: 11, sky: [178, 202, 205], glow: [245, 229, 186], accent: [34, 112, 126], crowd: [56, 74, 72] },
  { file: "preview-presence-1-poster.png", seed: 29, sky: [181, 193, 213], glow: [237, 218, 190], accent: [74, 94, 148], crowd: [55, 63, 86] },
  { file: "preview-busan-live-poster.png", seed: 47, sky: [171, 204, 214], glow: [240, 226, 180], accent: [30, 116, 145], crowd: [50, 78, 88] },
  { file: "preview-daejeon-live-poster.png", seed: 73, sky: [184, 199, 205], glow: [237, 226, 194], accent: [72, 128, 116], crowd: [58, 68, 76] }
]) {
  const bytes = renderPoster(scene);
  await writeFile(resolve(outDir, scene.file), bytes);
}

function renderPoster(scene) {
  const random = mulberry32(scene.seed);
  const pixels = Buffer.alloc(width * height * 4);
  const [sr, sg, sb] = scene.sky;
  const [gr, gg, gb] = scene.glow;
  const [ar, ag, ab] = scene.accent;

  for (let y = 0; y < height; y += 1) {
    const yn = y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const xn = x / (width - 1);
      const glow = Math.max(0, 1 - Math.hypot((xn - 0.42) * 1.48, (yn - 0.26) * 2.05));
      const street = smoothstep(0.58, 1, yn);
      const vignette = Math.max(0, 1 - Math.hypot((xn - 0.5) * 1.15, (yn - 0.54) * 1.2));
      const n = (random() - 0.5) * 7;
      const r = sr * (0.96 - yn * 0.26) + gr * glow * 0.2 + ar * street * 0.08 + n;
      const g = sg * (0.96 - yn * 0.22) + gg * glow * 0.18 + ag * street * 0.07 + n;
      const b = sb * (0.96 - yn * 0.18) + gb * glow * 0.16 + ab * street * 0.06 + n;
      set(pixels, x, y, r * (0.88 + vignette * 0.16), g * (0.88 + vignette * 0.16), b * (0.88 + vignette * 0.16), 255);
    }
  }

  drawCityLine(pixels, scene, random);
  drawStreetBands(pixels, scene);
  drawSoftLight(pixels, width * 0.24, height * 0.2, 150, [255, 255, 255], 0.18);
  drawSoftLight(pixels, width * 0.72, height * 0.27, 110, [ar, ag, ab], 0.16);
  drawCrowd(pixels, scene, random);
  drawRedactionBlocks(pixels, random);
  drawForegroundFrame(pixels);

  return png(width, height, pixels);
}

function drawCityLine(pixels, scene, random) {
  for (let i = 0; i < 34; i += 1) {
    const w = 20 + Math.floor(random() * 42);
    const h = 70 + Math.floor(random() * 150);
    const x = Math.floor(random() * width);
    const y = Math.floor(height * 0.56 - h);
    fillRect(pixels, x, y, w, h, [38, 56, 60, 112 + random() * 34]);
    if (random() > 0.58) fillRect(pixels, x + w * 0.25, y + h * 0.24, 4, 4, [...scene.accent, 96]);
  }
  fillRect(pixels, 0, Math.floor(height * 0.55), width, 8, [60, 82, 82, 92]);
}

function drawStreetBands(pixels, scene) {
  fillRect(pixels, 0, Math.floor(height * 0.56), width, Math.floor(height * 0.44), [202, 207, 198, 42]);
  fillRect(pixels, 0, Math.floor(height * 0.68), width, 2, [...scene.accent, 42]);
  fillRect(pixels, 0, Math.floor(height * 0.81), width, 2, [255, 255, 255, 34]);
}

function drawCrowd(pixels, scene, random) {
  for (let i = 0; i < 190; i += 1) {
    const x = Math.floor(random() * width);
    const y = Math.floor(height * (0.63 + random() * 0.32));
    const scale = 0.45 + (y / height) * 1.4;
    const head = Math.floor(4 + scale * 4 + random() * 3);
    const bodyW = Math.floor(head * (2.1 + random() * 0.8));
    const bodyH = Math.floor(head * (3.4 + random() * 1.8));
    const shade = scene.crowd.map((v) => Math.max(0, v + (random() - 0.5) * 10));
    fillCircle(pixels, x, y, head, [...shade, 132]);
    fillEllipse(pixels, x, y + head + bodyH * 0.35, bodyW, bodyH, [...shade, 156]);
  }

  for (let i = 0; i < 16; i += 1) {
    const x = Math.floor(width * (0.12 + random() * 0.76));
    const y = Math.floor(height * (0.57 + random() * 0.16));
    const w = Math.floor(30 + random() * 62);
    const h = Math.floor(16 + random() * 28);
    fillRect(pixels, x, y, w, h, [250, 251, 238, 128]);
    fillRect(pixels, x + w / 2, y + h, 3, 34 + random() * 26, [168, 174, 166, 96]);
  }
}

function drawRedactionBlocks(pixels, random) {
  for (let i = 0; i < 26; i += 1) {
    const w = Math.floor(28 + random() * 82);
    const h = Math.floor(18 + random() * 48);
    const x = Math.floor(random() * (width - w));
    const y = Math.floor(height * 0.55 + random() * height * 0.35);
    fillRect(pixels, x, y, w, h, [236, 240, 235, 118]);
    fillRect(pixels, x, y, w, 2, [255, 255, 255, 72]);
  }
}

function drawForegroundFrame(pixels) {
  fillRect(pixels, 0, 0, width, 64, [0, 0, 0, 12]);
  fillRect(pixels, 0, height - 92, width, 92, [0, 0, 0, 22]);
  for (let y = 0; y < height; y += 1) {
    const alpha = y < 36 ? 16 - y * 0.38 : y > height - 54 ? (y - height + 54) * 0.42 : 0;
    if (alpha > 0) fillRect(pixels, 0, y, width, 1, [0, 0, 0, alpha]);
  }
}

function drawSoftLight(pixels, cx, cy, radius, color, alpha) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d <= 1) blend(pixels, x, y, color, alpha * (1 - d) * 255);
    }
  }
}

function fillRect(pixels, x, y, w, h, rgba) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.ceil(x + w));
  const y1 = Math.min(height, Math.ceil(y + h));
  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) blend(pixels, px, py, rgba.slice(0, 3), rgba[3] ?? 255);
  }
}

function fillCircle(pixels, cx, cy, r, rgba) {
  const rr = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      if (x >= 0 && y >= 0 && x < width && y < height && (x - cx) ** 2 + (y - cy) ** 2 <= rr) blend(pixels, x, y, rgba.slice(0, 3), rgba[3] ?? 255);
    }
  }
}

function fillEllipse(pixels, cx, cy, rx, ry, rgba) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (x >= 0 && y >= 0 && x < width && y < height && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) blend(pixels, x, y, rgba.slice(0, 3), rgba[3] ?? 255);
    }
  }
}

function set(pixels, x, y, r, g, b, a) {
  const index = (y * width + x) * 4;
  pixels[index] = clamp(r);
  pixels[index + 1] = clamp(g);
  pixels[index + 2] = clamp(b);
  pixels[index + 3] = clamp(a);
}

function blend(pixels, x, y, rgb, alpha) {
  const index = (y * width + x) * 4;
  const a = clamp(alpha) / 255;
  pixels[index] = clamp(pixels[index] * (1 - a) + rgb[0] * a);
  pixels[index + 1] = clamp(pixels[index + 1] * (1 - a) + rgb[1] * a);
  pixels[index + 2] = clamp(pixels[index + 2] * (1 - a) + rgb[2] * a);
  pixels[index + 3] = 255;
}

function png(w, h, rgba) {
  const scanlines = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    scanlines[y * (w * 4 + 1)] = 0;
    rgba.copy(scanlines, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.concat([uint32(w), uint32(h), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  return Buffer.concat([uint32(data.length), typeBuffer, data, uint32(crc32(Buffer.concat([typeBuffer, data])))]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
