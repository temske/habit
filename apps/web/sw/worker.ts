/**
 * The service worker. It keeps the app shell (index.html, the scripts, the styles, the main fonts
 * and the icons) in the Cache API, so the app opens at once and without the network. Then the app
 * shows the snapshot from IndexedDB, as it does on every start.
 *
 * It never answers a request to another origin: Convex and Clerk go to the network as if there was
 * no worker. The rules are in `strategy.ts`.
 *
 * The build (`build/service-worker.ts`) bundles this file to `/sw.js` and writes the list of files
 * in place of `self.__HABIT_PRECACHE__`. A new deploy changes that list, so the browser installs
 * the new worker; it takes over at once (`skipWaiting`, `clients.claim`), and
 * `src/service-worker.ts` loads the new version in the page.
 */
import { cacheable, SHELL_URL, strategyFor, type Precache } from "./strategy";

declare const self: ServiceWorkerGlobalScope & { __HABIT_PRECACHE__: Precache };

const { version, urls } = self.__HABIT_PRECACHE__;
const PREFIX = "habit-";
/** The files of this version, all fetched at install. */
const SHELL_CACHE = `${PREFIX}shell-${version}`;
/** The build's files that load on first use (Phosphor icons, other font subsets). */
const ASSET_CACHE = `${PREFIX}assets-${version}`;
const precached = new Set(urls);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        urls.map(async (url) => {
          // A file with a content hash in its name that an older version cached already.
          if (url.startsWith("/assets/")) {
            const old = await caches.match(url, { ignoreVary: true });
            if (old !== undefined) return cache.put(url, old);
          }
          // `reload`: past the HTTP cache, so index.html is the new one.
          const response = await fetch(new Request(url, { cache: "reload" }));
          if (!response.ok) throw new Error(`precache-failed: ${url} ${response.status}`);
          return cache.put(url, response);
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // The caches of older versions. A tab of an older version that asks for one of its chunks
      // now gets the network's 404, and main.tsx loads the new version.
      for (const name of await caches.keys()) {
        if (name.startsWith(PREFIX) && name !== SHELL_CACHE && name !== ASSET_CACHE) {
          await caches.delete(name);
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const strategy = strategyFor(event.request, self.location.origin, precached);
  if (strategy === "network") return;
  event.respondWith(strategy === "shell" ? shell(event.request) : fromCache(event.request));
});

// The first visit loads the page before the worker exists, so the icons it loaded are only in the
// HTTP cache. The page sends their paths when the worker takes over (src/service-worker.ts).
self.addEventListener("message", (event) => {
  const data: unknown = event.data;
  if (!isWarmMessage(data)) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      for (const path of data.paths) {
        const url = new URL(path, self.location.origin);
        if (
          strategyFor({ url: url.href, method: "GET", mode: "cors" }, url.origin, precached) !==
          "cache"
        )
          continue;
        if ((await caches.match(url.href, { ignoreVary: true })) !== undefined) continue;
        const response = await fetch(url.href).catch(() => null);
        if (response !== null && cacheable(response)) await cache.put(url.href, response);
      }
    })(),
  );
});

function isWarmMessage(data: unknown): data is { type: "warm"; paths: string[] } {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "warm" &&
    Array.isArray((data as { paths?: unknown }).paths)
  );
}

async function shell(request: Request): Promise<Response> {
  const cached = await caches.match(SHELL_URL, { cacheName: SHELL_CACHE, ignoreVary: true });
  return cached ?? fetch(request);
}

async function fromCache(request: Request): Promise<Response> {
  // `ignoreVary`: a server that sends `Vary: Origin` would make a module script (which has an
  // Origin header) miss the copy that the install fetched without one.
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached !== undefined) return cached;
  const response = await fetch(request);
  if (cacheable(response)) {
    const copy = response.clone();
    // Not awaited: the page gets the file at once.
    void caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}
