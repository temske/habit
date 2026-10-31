import { expect, test } from "vite-plus/test";

import { cacheable, strategyFor } from "./strategy";

const ORIGIN = "https://habit.tem.sh";
const PRECACHED = new Set(["/", "/assets/index-abc.js", "/manifest.webmanifest", "/icon-192.png"]);

const get = (url: string, mode = "cors") =>
  strategyFor({ url, method: "GET", mode }, ORIGIN, PRECACHED);

test("never answers Convex or Clerk, on any method or mode", () => {
  for (const url of [
    "https://fantastic-chihuahua-570.convex.cloud/api/1.47.0/sync",
    "https://fantastic-chihuahua-570.convex.cloud/api/query",
    "https://fantastic-chihuahua-570.convex.site/http",
    "https://clerk.habit.tem.sh/v1/client?_clerk_js_version=6",
    "https://clerk.habit.tem.sh/npm/@clerk/clerk-js@6/dist/clerk.browser.js",
    "https://pleased-antelope-7833.clerk.accounts.dev/v1/environment",
    "https://accounts.google.com/o/oauth2/v2/auth",
  ]) {
    expect(get(url)).toBe("network");
    expect(get(url, "navigate")).toBe("network");
    expect(strategyFor({ url, method: "POST", mode: "cors" }, ORIGIN, PRECACHED)).toBe("network");
  }
});

test("opens each page of the app from the cached shell", () => {
  expect(get(`${ORIGIN}/`, "navigate")).toBe("shell");
  expect(get(`${ORIGIN}/?__clerk_db_jwt=x`, "navigate")).toBe("shell");
  expect(get(`${ORIGIN}/habits/0192f3a1-7c1e-7000-8000-000000000000`, "navigate")).toBe("shell");
  expect(get(`${ORIGIN}/sso-callback?redirect=1`, "navigate")).toBe("shell");
});

test("sends other pages on the app's origin to the server", () => {
  // Such as a proxy of Clerk's Frontend API, which Google's return goes through.
  expect(get(`${ORIGIN}/__clerk/v1/oauth_callback?code=1`, "navigate")).toBe("network");
  expect(get(`${ORIGIN}/manifest.webmanifest`, "navigate")).toBe("network");
  expect(get(`${ORIGIN}/habits/a/b`, "navigate")).toBe("network");
});

test("serves the build's files from the cache, and nothing else of the origin", () => {
  expect(get(`${ORIGIN}/assets/index-abc.js`)).toBe("cache");
  expect(get(`${ORIGIN}/icon-192.png`)).toBe("cache");
  // A Phosphor icon that is not precached: cached when it first loads.
  expect(get(`${ORIGIN}/assets/Guitar.es-CK9-KRVi.js`)).toBe("cache");
  expect(get(`${ORIGIN}/sw.js`)).toBe("network");
  expect(get(`${ORIGIN}/icon-192.png?v=2`)).toBe("network");
  expect(
    strategyFor({ url: `${ORIGIN}/assets/x.js`, method: "HEAD", mode: "cors" }, ORIGIN, PRECACHED),
  ).toBe("network");
});

test("never caches an error, another origin's file, or HTML in place of a file", () => {
  const response = (ok: boolean, type: string, contentType: string) => ({
    ok,
    type,
    headers: new Headers({ "content-type": contentType }),
  });
  expect(cacheable(response(true, "basic", "text/javascript"))).toBe(true);
  expect(cacheable(response(false, "basic", "text/javascript"))).toBe(false);
  expect(cacheable(response(true, "opaque", "text/javascript"))).toBe(false);
  expect(cacheable(response(true, "basic", "text/html; charset=utf-8"))).toBe(false);
});
