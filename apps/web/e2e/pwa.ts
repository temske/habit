/**
 * The check of the installable app, on a production build with the fake provider, in Google
 * Chrome. It needs no network and no login, but it builds the app and starts `vp preview`, so it
 * is a task of its own and not part of `vp run ready`.
 *
 *   vp -C apps/web run pwa
 *
 * It checks what Lighthouse checks for an install (Chrome's own installability errors), the
 * manifest and its icons, the iOS tags, the worker's caches, an offline start that shows the list
 * and opens a habit page, and the update to a new build in an open tab.
 *
 * When an offline step fails, it prints the requests that failed and saves a screenshot to the
 * temporary directory (habit-pwa-offline*.png).
 *
 * Settings, all optional: PWA_PORT (default 5434), E2E_HEADED=true (show the browser), E2E_CHROME
 * (the path of a Chrome or Chromium binary, instead of the installed Google Chrome).
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Page } from "playwright-core";

const APP = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.env.PWA_PORT ?? 5434);
const BASE = `http://localhost:${PORT}`;
const OUT = mkdtempSync(join(tmpdir(), "habit-pwa-build-"));
const PROFILE = mkdtempSync(join(tmpdir(), "habit-pwa-profile-"));

const failures: string[] = [];

function check(ok: boolean, what: string) {
  console.log(`${ok ? "  ✓" : "  ✗"} ${what}`);
  if (!ok) failures.push(what);
}

function build() {
  execFileSync("vp", ["build", "--outDir", OUT, "--emptyOutDir"], {
    cwd: APP,
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, VITE_HABIT_DATA: "fake" },
  });
}

/** The precache list that the build wrote into sw.js. */
function precacheOf(): { version: string; urls: string[] } {
  const code = readFileSync(join(OUT, "sw.js"), "utf8");
  const match = /\{"version":"[0-9a-f]+","urls":\[[^\]]*\]\}/.exec(code);
  if (match === null) throw new Error("no precache list in sw.js");
  return JSON.parse(match[0]);
}

async function startPreview() {
  const child = spawn("vp", ["preview", "--outDir", OUT, "--port", String(PORT), "--strictPort"], {
    cwd: APP,
    stdio: "ignore",
    // Its own process group, so a kill stops the server that `vp` starts too.
    detached: true,
  });
  const stop = () => {
    if (child.pid !== undefined) process.kill(-child.pid);
  };
  for (let i = 0; i < 100; i += 1) {
    const up = await fetch(BASE).then(
      (r) => r.ok,
      () => false,
    );
    if (up) return stop;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  stop();
  throw new Error(`vp preview did not start on port ${PORT}`);
}

async function listShows(page: Page) {
  return page
    .getByRole("heading", { name: "Habits" })
    .waitFor({ state: "attached", timeout: 10_000 })
    .then(
      () => true,
      () => false,
    );
}

async function main() {
  console.log("build (fake provider)");
  build();
  const first = precacheOf();
  const preview = await startPreview();
  const launchOptions = {
    headless: process.env.E2E_HEADED !== "true",
    ...(process.env.E2E_CHROME === undefined
      ? { channel: "chrome" }
      : { executablePath: process.env.E2E_CHROME }),
  };
  let close = async () => {};
  try {
    // A persistent profile: Chrome does not install from an incognito window.
    const context = await chromium.launchPersistentContext(PROFILE, {
      ...launchOptions,
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    close = () => context.close();
    const page = context.pages()[0] ?? (await context.newPage());
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    console.log("first visit");
    await page.goto(BASE);
    check(await listShows(page), "the list shows");

    console.log("installability");
    const cdp = await context.newCDPSession(page);
    const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
    check(
      installabilityErrors.length === 0,
      `Chrome finds no installability error ${JSON.stringify(installabilityErrors)}`,
    );
    const manifest = await (await fetch(`${BASE}/manifest.webmanifest`)).json();
    check(manifest.name === "Habit" && manifest.short_name === "Habit", "the manifest names Habit");
    check(manifest.display === "standalone", "the display is standalone");
    check(manifest.start_url === "/" && manifest.scope === "/", "start_url and scope are /");
    for (const icon of manifest.icons as Array<{ src: string; sizes: string; purpose: string }>) {
      const response = await fetch(`${BASE}${icon.src}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      // A PNG's width and height are at bytes 16 and 20.
      const size = `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
      check(response.ok && size === icon.sizes, `${icon.src} (${icon.purpose}) is ${icon.sizes}`);
    }
    for (const purpose of ["any", "maskable"]) {
      check(
        manifest.icons.some((i: { sizes: string; purpose: string }) => {
          return i.purpose === purpose && i.sizes === "512x512";
        }),
        `a 512px ${purpose} icon`,
      );
    }
    const head = await page.evaluate(() => ({
      touchIcon: document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')?.href,
      capable: document
        .querySelector('meta[name="apple-mobile-web-app-capable"]')
        ?.getAttribute("content"),
      statusBar: document
        .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
        ?.getAttribute("content"),
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content"),
    }));
    const touch = await fetch(head.touchIcon ?? "");
    const touchBytes = Buffer.from(await touch.arrayBuffer());
    check(touch.ok && touchBytes.readUInt32BE(16) === 180, "the apple-touch-icon is a 180px PNG");
    check(head.capable === "yes", "apple-mobile-web-app-capable is yes");
    check(head.statusBar === "default", "the status bar style is default");
    check(head.viewport?.includes("viewport-fit=cover") === true, "the viewport covers the notch");

    console.log("the worker");
    await page.evaluate(() => navigator.serviceWorker.ready);
    if ((await page.evaluate(() => navigator.serviceWorker.controller)) === null) {
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    }
    check(true, "a worker controls the page");
    // The icons of the first visit, which the page hands to the worker when it takes over.
    const iconsCached = await page
      .waitForFunction(
        async () => {
          for (const name of await caches.keys()) {
            const keys = await (await caches.open(name)).keys();
            if (keys.some((request) => /\/assets\/[A-Za-z]+\.es-/.test(request.url))) return true;
          }
          return false;
        },
        undefined,
        { timeout: 10_000 },
      )
      .then(
        () => true,
        () => false,
      );
    check(iconsCached, "the icons of the first visit are cached");
    const cached = await page.evaluate(async () => {
      const result: Record<string, string[]> = {};
      for (const name of await globalThis.caches.keys()) {
        const cache = await globalThis.caches.open(name);
        result[name] = (await cache.keys()).map((request) => new URL(request.url).pathname);
      }
      return result;
    });
    const shell = cached[`habit-shell-${first.version}`] ?? [];
    check(
      shell.length === first.urls.length && first.urls.every((url) => shell.includes(url)),
      `the shell cache holds the ${first.urls.length} precached files`,
    );
    const everything = Object.values(cached).flat();
    check(
      everything.every((path) => path.startsWith("/")),
      "every cached file is of this origin",
    );

    console.log("offline start");
    await context.setOffline(true);
    const served: string[] = [];
    const onResponse = (response: { url(): string; fromServiceWorker(): boolean }) => {
      if (response.fromServiceWorker()) served.push(new URL(response.url()).pathname);
    };
    page.on("response", onResponse);
    // What failed offline, printed with a screenshot when a step fails.
    const failed: string[] = [];
    page.on("requestfailed", (request) => failed.push(request.url()));
    page.on("console", (message) => {
      if (message.type() === "error") failed.push(`console: ${message.text()}`);
    });
    await page.reload();
    const offlineList = await listShows(page);
    if (!offlineList) {
      await page.screenshot({ path: join(tmpdir(), "habit-pwa-offline.png") });
      console.log(failed.join("\n"));
    }
    check(offlineList, "offline, the list shows after a reload");
    check(served.includes("/"), "the worker served the page");
    const row = page.locator('a[href^="/habits/"]').first();
    await row.click();
    const opened = await page
      .waitForURL(/\/habits\//, { timeout: 5000 })
      .then(() => page.getByLabel("Back to habits").first().waitFor({ timeout: 5000 }))
      .then(
        () => true,
        () => false,
      );
    if (!opened) {
      await page.screenshot({ path: join(tmpdir(), "habit-pwa-offline-page.png") });
      console.log(page.url(), failed.slice(-10).join("\n"));
    }
    check(opened, "offline, a habit page opens");
    await page.reload();
    const pageAgain = await page
      .getByLabel("Back to habits")
      .first()
      .waitFor({ timeout: 5000 })
      .then(
        () => true,
        () => false,
      );
    check(pageAgain, "offline, a reload of a habit page opens it");
    page.off("response", onResponse);
    await context.setOffline(false);
    await page.goto(BASE);
    await listShows(page);

    console.log("update to a new build");
    // A change to a public file is enough to make a new version.
    const marker = join(APP, "public", "__pwa-check.txt");
    writeFileSync(marker, String(Date.now()));
    try {
      build();
    } finally {
      rmSync(marker, { force: true });
    }
    const second = precacheOf();
    check(second.version !== first.version, "the new build has a new version");
    // What the app does when it comes back to the screen (src/service-worker.ts).
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    const updated = await page
      .waitForFunction(
        async (version) => (await caches.keys()).includes(`habit-shell-${version}`),
        second.version,
        { timeout: 15_000 },
      )
      .then(
        () => true,
        () => false,
      );
    check(updated, "the open app installs the new worker");
    const oldGone = await page
      .waitForFunction(
        async (version) => !(await caches.keys()).includes(`habit-shell-${version}`),
        first.version,
        { timeout: 15_000 },
      )
      .then(
        () => true,
        () => false,
      );
    check(oldGone, "the new worker deletes the old cache");
    await page.reload();
    check(await listShows(page), "after a reload, the new version shows the list");

    check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
  } finally {
    await close();
    preview();
    rmSync(OUT, { recursive: true, force: true });
    rmSync(PROFILE, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} failure(s):\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("\n✓ all checks passed");
  }
}

await main();
