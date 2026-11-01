import type { AnyRouter, NavigateOptions } from "@tanstack/react-router";

/** The router's view transition with types (`@tanstack/router-core` names it, React Router does not). */
type ViewTransitionOptions = Exclude<NonNullable<NavigateOptions["viewTransition"]>, boolean>;

/**
 * The transition between the list and the page of a habit, through the View Transitions API that
 * the router runs. It names its direction as a view transition type, and screens.css draws it:
 *
 * - `screen-push`: to the page of a habit. On a phone the page slides in from the right over the
 *   list, which moves a third of the way to the left and dims, as a native app pushes a screen.
 * - `screen-pop`: back to the list, the reverse.
 * - `screen-swap`: from the page of one habit to another (a desktop, where the pages change beside
 *   the list).
 *
 * On a desktop the page slides in beside the list instead (screens.css). Under reduced motion the
 * screens crossfade. A browser without view transitions navigates without one, and a browser
 * without view transition types crossfades.
 */
export const screenTransition: ViewTransitionOptions = {
  types: ({ fromLocation, toLocation }) => [
    direction(fromLocation?.pathname ?? "/", toLocation.pathname),
  ],
};

function direction(from: string, to: string): "screen-push" | "screen-pop" | "screen-swap" {
  // The tabs of the dock (the list, the settings) are the top level; a habit's page is under it.
  const depth = (path: string) => (path.startsWith("/habits/") ? 1 : 0);
  if (depth(to) > depth(from)) return "screen-push";
  if (depth(to) < depth(from)) return "screen-pop";
  return "screen-swap";
}

/**
 * Prepares the transition of a link that is about to change the screen: a row of the list, or the
 * Back button of a page. The link itself asks the router for `screenTransition`.
 */
export function beforeScreenChange(): void {
  passTapsThrough();
}

/**
 * The browser's own back and forward between the list and a page (its buttons, a key, a mouse
 * button) play the same transition, unless the browser animates the change itself, as the back
 * swipe on iOS does: a second animation on top of it would play twice. It listens to the
 * Navigation API's `navigate`, which comes before the router hears of the change on `popstate`; a
 * browser without the API changes the screen without the transition. Returns the cleanup.
 */
export function animateTraversals(router: AnyRouter): () => void {
  if (!("navigation" in window)) return () => {};
  const onNavigate = (event: NavigateEvent) => {
    const skip = skipNext;
    skipNext = false;
    if (skip || event.navigationType !== "traverse" || event.hasUAVisualTransition) return;
    // A sheet that opens or closes stays on the same screen.
    if (new URL(event.destination.url).pathname === window.location.pathname) return;
    passTapsThrough();
    router.shouldViewTransition = screenTransition;
  };
  navigation.addEventListener("navigate", onNavigate);
  return () => navigation.removeEventListener("navigate", onNavigate);
}

let skipNext = false;

/**
 * The next change of the screen plays no transition: the swipe back has already moved the page
 * away with the finger (swipe-back.ts).
 */
export function skipNextTransition(): void {
  skipNext = true;
}

/** How long after a click the transition can still run (the screen loads, then moves). */
const TRANSITION_WINDOW_MS = 1500;
/** A press that moves farther than this is not a tap. */
const TAP_SLOP_PX = 10;

let stopPassing: (() => void) | undefined;

/**
 * While a view transition runs, the browser gives every pointer event to the document, so a tap on
 * the new screen would be lost. For the time of the transition, a pointer that goes down ends it
 * and, if it lifts as a tap, clicks the control under it once the screen is in place. A click
 * without a pointer is what Enter gives, so the calendar takes it as a tap on the Day.
 */
function passTapsThrough(): void {
  stopPassing?.();
  const onDown = (down: PointerEvent) => {
    const ended = endTransition();
    if (ended === null) return;
    const onUp = (up: PointerEvent) => {
      if (up.pointerId !== down.pointerId) return;
      window.removeEventListener("pointerup", onUp, true);
      if (Math.hypot(up.clientX - down.clientX, up.clientY - down.clientY) > TAP_SLOP_PX) return;
      // The overlay of the transition goes away a frame after it ends; until then it is the only
      // thing under the finger.
      void ended.then(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            document
              .elementFromPoint(down.clientX, down.clientY)
              ?.closest<HTMLElement>("button:not(:disabled), a[href]")
              ?.click(),
          ),
        ),
      );
    };
    window.addEventListener("pointerup", onUp, true);
  };
  document.addEventListener("pointerdown", onDown, true);
  const timer = window.setTimeout(() => stopPassing?.(), TRANSITION_WINDOW_MS);
  stopPassing = () => {
    document.removeEventListener("pointerdown", onDown, true);
    window.clearTimeout(timer);
    stopPassing = undefined;
  };
}

/**
 * Ends the running view transition: skips it where the browser exposes it
 * (`document.activeViewTransition`), else finishes its animations. Resolves when the new screen is
 * in place; null when no transition runs.
 */
function endTransition(): Promise<void> | null {
  const active = (document as Document & { activeViewTransition?: ViewTransition | null })
    .activeViewTransition;
  if (active !== undefined) {
    if (active === null) return null;
    active.skipTransition();
    return active.finished.catch(() => {});
  }
  const running = document
    .getAnimations()
    .filter((animation) =>
      (animation.effect as KeyframeEffect | null)?.pseudoElement?.startsWith("::view-transition"),
    );
  if (running.length === 0) return null;
  for (const animation of running) animation.finish();
  return Promise.resolve();
}
