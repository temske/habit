import { expect, test } from "vite-plus/test";

import { precached } from "./service-worker";

const asset = (fileName: string) => ({ fileName, dynamicOnly: false, module: null });

test("precaches the shell, the route chunks and the main fonts", () => {
  expect(precached(asset("index.html"))).toBe(true);
  expect(precached(asset("assets/index-l0LJjpyp.css"))).toBe(true);
  expect(precached(asset("assets/ibm-plex-sans-latin-wght-normal-IvpUvPa2.woff2"))).toBe(true);
  expect(precached(asset("assets/ibm-plex-sans-latin-ext-wght-normal-CIII54If.woff2"))).toBe(true);
  expect(
    precached({
      fileName: "assets/_screens.habits._habitId-CcmIGgy_.js",
      dynamicOnly: true,
      module: "/repo/apps/web/src/routes/_screens.habits.$habitId.tsx?tsr-split=component",
    }),
  ).toBe(true);
});

test("leaves the icons, the other font subsets and the worker itself to load on first use", () => {
  expect(
    precached({
      fileName: "assets/Guitar.es-CK9-KRVi.js",
      dynamicOnly: true,
      module: "/repo/node_modules/@phosphor-icons/react/dist/csr/Guitar.es.js",
    }),
  ).toBe(false);
  expect(precached(asset("assets/ibm-plex-sans-cyrillic-wght-normal-BAAhND-U.woff2"))).toBe(false);
  expect(precached(asset("assets/ibm-plex-mono-latin-400-normal-DMJ8VG8y.woff2"))).toBe(false);
  expect(precached(asset("assets/ibm-plex-mono-latin-400-normal-CvHOgSBP.woff"))).toBe(false);
  expect(precached(asset("sw.js"))).toBe(false);
  expect(precached(asset("assets/index-BjUKWfht.js.map"))).toBe(false);
});
