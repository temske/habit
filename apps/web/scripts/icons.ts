/**
 * Draws the app icon and writes every file that the manifest and index.html link: the SVG
 * favicon, `favicon.ico`, the PNG icons ("any" and "maskable") and the Apple touch icon.
 *
 * The icon is one Day gauge (DESIGN.md, "Day gauge"), two thirds full, in the dark theme's blue
 * on the dark theme's pure black. The corners are the gauge's squircle: a superellipse(2) corner
 * of 19% of the side, times 1.75 (`--squircle-k`).
 *
 * Run it after a change to the drawing: `vp -C apps/web run icons`. It renders the PNGs in Google
 * Chrome (playwright-core), so the result is the same as the browser draws the SVG.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));

/** `--habit-blue` of the dark theme (styles.css). */
const BLUE = "#6f9bd1";
/** The dark theme's ground. */
const GROUND = "#000000";
/** How full the gauge is. */
const FILL = 2 / 3;
/** The frame of the dark theme: the habit color at `--frame-mix` (35%) over the ground. */
const FRAME_MIX = 0.35;
/** The frame is 1.5px on a 30px square: 5% of the side. */
const FRAME = 0.05;

/**
 * The path of a square of side `size` at (`x`, `y`) with superellipse(2) corners (the exponent
 * is 2² = 4) of radius `radius`.
 */
function squircle(x: number, y: number, size: number, radius: number): string {
  const steps = 24;
  const points: Array<[number, number]> = [];
  // The four corners, clockwise from the top right; each is a quarter of |u|⁴ + |v|⁴ = 1.
  const corners: Array<[number, number, number]> = [
    [x + size - radius, y + radius, -90],
    [x + size - radius, y + size - radius, 0],
    [x + radius, y + size - radius, 90],
    [x + radius, y + radius, 180],
  ];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= steps; i += 1) {
      const angle = ((start + (90 * i) / steps) * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      points.push([
        cx + radius * Math.sign(cos) * Math.abs(cos) ** 0.5,
        cy + radius * Math.sign(sin) * Math.abs(sin) ** 0.5,
      ]);
    }
  }
  return `M${points.map(([px, py]) => `${px.toFixed(2)} ${py.toFixed(2)}`).join("L")}Z`;
}

/**
 * One gauge of side `size` at (`x`, `y`), `fill` full, in `color`, with its frame at `frameMix`
 * over the ground. `id` names its clip path.
 */
function gaugeAt(
  id: string,
  x: number,
  y: number,
  size: number,
  { color = BLUE, fill = FILL, frameMix = FRAME_MIX } = {},
): string {
  const radius = size * 0.19 * 1.75;
  const outline = squircle(x, y, size, radius);
  const top = y + size * (1 - fill);
  return [
    `<clipPath id="${id}"><path d="${outline}"/></clipPath>`,
    `<g clip-path="url(#${id})">`,
    // The frame is an inset ring: a stroke of twice its width, clipped to the outline.
    `<path d="${outline}" fill="none" stroke="${color}" stroke-opacity="${frameMix}" stroke-width="${size * FRAME * 2}"/>`,
    `<rect x="${x}" y="${top}" width="${size}" height="${y + size - top}" fill="${color}"/>`,
    `</g>`,
  ].join("");
}

/** The gauge alone, centered in a 1024 box, `size` wide. */
const gauge = (size: number) => gaugeAt("g", (1024 - size) / 2, (1024 - size) / 2, size);

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${body}</svg>\n`;

/**
 * The full-bleed icon: the ground to every edge, for the Apple touch icon (iOS rounds its corners)
 * and the maskable icon (Android cuts its own shape). The gauge stays inside the maskable safe
 * zone, a circle of 80% of the side.
 */
const fullBleed = svg(`<rect width="1024" height="1024" fill="${GROUND}"/>${gauge(540)}`);

/**
 * The "any" icon, for a desktop install: a black squircle tile in the 824px grid of a macOS icon,
 * with transparent corners.
 */
const tile = svg(
  `<path d="${squircle(100, 100, 824, 824 * 0.225)}" fill="${GROUND}"/>${gauge(440)}`,
);

/** The favicon: the gauge alone, larger, on no ground. */
const favicon = svg(gauge(940));

/** An ICO file that holds PNG images (supported since Windows Vista and in every browser). */
function ico(images: Array<{ size: number; png: Buffer }>): Buffer {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size % 256, entry);
    header.writeUInt8(size % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.png)]);
}

const browser = await chromium.launch(
  process.env.E2E_CHROME === undefined
    ? { channel: "chrome" }
    : { executablePath: process.env.E2E_CHROME },
);
const page = await browser.newPage();

async function render(source: string, size: number): Promise<Buffer> {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
  );
  return page.screenshot({ omitBackground: true, type: "png" });
}

const outputs: Array<[string, string | Buffer]> = [
  ["icon.svg", favicon],
  ["icon-192.png", await render(tile, 192)],
  ["icon-512.png", await render(tile, 512)],
  ["icon-maskable-192.png", await render(fullBleed, 192)],
  ["icon-maskable-512.png", await render(fullBleed, 512)],
  ["apple-touch-icon.png", await render(fullBleed, 180)],
  [
    "favicon.ico",
    ico([
      { size: 16, png: await render(favicon, 16) },
      { size: 32, png: await render(favicon, 32) },
      { size: 48, png: await render(favicon, 48) },
    ]),
  ],
];
await browser.close();

for (const [name, content] of outputs) {
  await writeFile(`${PUBLIC}${name}`, content);
  console.log(`public/${name}`);
}
