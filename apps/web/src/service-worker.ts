/**
 * Registers the service worker (`sw/worker.ts`) and brings a new deploy into an open app.
 *
 * The browser looks for a new worker at each start; an app that stays open, as an installed app
 * on iOS does for days, also looks each time it comes back to the screen. A new worker takes over
 * at once, but the page still runs the old version. The page loads the new version when that is
 * least in the way: at once if the person opened the app a moment ago, or else the next time the
 * app comes back to the screen. A tab of an old version that asks for a chunk the deploy removed
 * reloads on its own (`vite:preloadError` in main.tsx).
 */

/** How long after the app comes to the screen a reload still counts as part of the start. */
export const START_MS = 10_000;
/** The least time between two checks for a new worker. */
const CHECK_EVERY_MS = 10 * 60_000;

/** What the page does when a new worker took over. */
export function onNewWorker(state: { visible: boolean; visibleSince: number; now: number }) {
  return state.visible && state.now - state.visibleSince < START_MS ? "reload" : "wait";
}

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  const container = navigator.serviceWorker;
  // No worker controls the first visit: the first worker to take over is not an update.
  let controlled = container.controller !== null;
  let pending = false;
  let visibleSince = performance.now();
  let checkedAt = performance.now();

  container.addEventListener("controllerchange", () => {
    if (!controlled) {
      controlled = true;
      // The files that this first visit loaded before the worker existed, such as the icons of
      // the habits, so they open offline too.
      const paths = performance
        .getEntriesByType("resource")
        .map((entry) => new URL(entry.name))
        .filter((url) => url.origin === location.origin && url.pathname.startsWith("/assets/"))
        .map((url) => url.pathname);
      container.controller?.postMessage({ type: "warm", paths });
      return;
    }
    const action = onNewWorker({
      visible: document.visibilityState === "visible",
      visibleSince,
      now: performance.now(),
    });
    if (action === "reload") window.location.reload();
    else pending = true;
  });

  const registration = container.register("/sw.js", { updateViaCache: "none" });
  registration.catch(() => {
    // No worker (a private window, a blocked origin): the app works as a plain page.
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (pending) {
      window.location.reload();
      return;
    }
    visibleSince = performance.now();
    if (visibleSince - checkedAt < CHECK_EVERY_MS) return;
    checkedAt = visibleSince;
    void registration.then((r) => r.update()).catch(() => {});
  });
}
