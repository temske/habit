import { today } from "@habit/core";
import { HabitDataProvider } from "@habit/data";
import { RouterProvider } from "@tanstack/react-router";
import { lazy, StrictMode, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { installCssSprings } from "@/components/motion";
import { createAppRouter } from "@/router";
import { registerServiceWorker } from "@/service-worker";

import "@/styles.css";

type DataProvider = (props: { children: ReactNode }) => ReactNode;

/**
 * The app runs on the real backend (`VITE_HABIT_DATA=convex`, the dev default in
 * .env.development). `VITE_HABIT_DATA=fake` runs it on the in-memory provider with the demo data.
 * The fake provider loads only in fake mode, so it never ships in a real build.
 */
async function loadDataProvider(): Promise<DataProvider> {
  if (import.meta.env.VITE_HABIT_DATA !== "fake") return HabitDataProvider;
  const { FakeHabitDataProvider, demoState } = await import("@habit/data/testing");
  // Dev only: `?data=worst` (or empty, one, many) swaps the demo data for a break-ui dataset.
  const dataset = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get("data")
    : null;
  if (dataset !== null) {
    const { devDataset, isDevDataset } = await import("@/components/dev-data/fixtures");
    const { DevDataToggle } = await import("@/components/dev-data/toggle");
    if (isDevDataset(dataset)) {
      const initial = devDataset(dataset, today());
      return ({ children }) => (
        <FakeHabitDataProvider initial={initial}>
          {children}
          <DevDataToggle current={dataset} />
        </FakeHabitDataProvider>
      );
    }
  }
  const initial = demoState(today());
  const latencyMs = Number(import.meta.env.VITE_HABIT_FAKE_LATENCY_MS ?? 0);
  const failWrites = import.meta.env.VITE_HABIT_FAKE_FAIL === "true";
  return ({ children }) => (
    <FakeHabitDataProvider initial={initial} latencyMs={latencyMs} failWrites={failWrites}>
      {children}
    </FakeHabitDataProvider>
  );
}

installCssSprings();

// After a deploy, a tab that was open before it asks for chunks that no longer exist: load the
// new version instead of showing the router's error. At most once a minute, so a chunk that stays
// missing cannot reload the page in a loop.
// Offline there is no new version to load: the chunk is missing from the worker's cache.
window.addEventListener("vite:preloadError", () => {
  if (!navigator.onLine) return;
  const last = Number(sessionStorage.getItem("habit:reloaded-at") ?? 0);
  if (Date.now() - last < 60_000) return;
  sessionStorage.setItem("habit:reloaded-at", String(Date.now()));
  window.location.reload();
});

// The installed app's offline shell (sw/worker.ts). The dev server has no worker.
if (import.meta.env.PROD) registerServiceWorker();

// Dev only: the panel that switches the lab's variants (components/lab).
const LabPanel = import.meta.env.DEV ? lazy(() => import("@/components/lab/panel")) : null;

const Data = await loadDataProvider();
const router = createAppRouter();

const container = document.getElementById("root");
if (container === null) throw new Error("root-missing");

createRoot(container).render(
  <StrictMode>
    <Data>
      <RouterProvider router={router} />
      {LabPanel === null ? null : (
        <Suspense>
          <LabPanel />
        </Suspense>
      )}
    </Data>
  </StrictMode>,
);
