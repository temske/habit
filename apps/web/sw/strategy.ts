/**
 * The rules of the service worker (`sw/worker.ts`): which requests it answers, and how. They are
 * here, apart from the worker, so the tests can check them without a worker.
 */

/** What the build writes into the worker: the files to cache at install, and their version. */
export interface Precache {
  /** A hash of every precached file. A new version makes a new worker. */
  version: string;
  /** Same-origin paths, such as "/" and "/assets/index-abc123.js". */
  urls: string[];
}

/** The precache key of the app shell (index.html). Vercel and `vp preview` serve it at "/". */
export const SHELL_URL = "/";

/**
 * - `shell`: a page of the app. The worker answers with the cached index.html, so the app opens
 *   without the network.
 * - `cache`: a file of the build. The worker answers from its cache, or fetches and caches it.
 * - `network`: the worker does not answer, and the browser handles the request as if there was no
 *   worker. Convex (its WebSocket and its HTTP calls), Clerk, Google and every other origin are
 *   always here.
 */
export type Strategy = "shell" | "cache" | "network";

/** The pages of the app: the routes in `src/routes/`, and Clerk's return after Google. */
const APP_PAGES = [/^\/$/, /^\/habits\/[^/]+\/?$/, /^\/sso-callback\/?$/];

export function strategyFor(
  request: { url: string; method: string; mode: string },
  origin: string,
  precached: ReadonlySet<string>,
): Strategy {
  if (request.method !== "GET") return "network";
  const url = new URL(request.url);
  if (url.origin !== origin) return "network";
  if (request.mode === "navigate") {
    // Only the app's own pages. Anything else on this origin, such as a proxy of Clerk's
    // Frontend API, goes to the server.
    return APP_PAGES.some((page) => page.test(url.pathname)) ? "shell" : "network";
  }
  if (precached.has(url.pathname) && url.search === "") return "cache";
  // A file of the build that is not precached, such as a Phosphor icon or a font subset. Its name
  // has a content hash, so a cached copy never goes stale.
  if (url.pathname.startsWith("/assets/")) return "cache";
  return "network";
}

/** Whether a fetched file may go into the cache. */
export function cacheable(response: {
  ok: boolean;
  type: string;
  headers: { get(name: string): string | null };
}): boolean {
  // A host that rewrites every path to index.html answers a missing chunk with HTML: never keep
  // that as a script.
  const type = response.headers.get("content-type") ?? "";
  return response.ok && response.type === "basic" && !type.startsWith("text/html");
}
