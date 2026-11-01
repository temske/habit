/**
 * The bottom sheet's place on an iPhone: above the software keyboard, and in the installed app
 * flush with the display's rounded corners. See docs/notes/web-sheet.md.
 */

/**
 * The display's corner radius in points, by the screen's size in points (either orientation), or
 * null for a screen that is not in the table. CSS cannot read it; these are the values of UIKit's
 * private `_displayCornerRadius`, as the ScreenCorners library reports them
 * (https://github.com/kylebshr/ScreenCorners). Two sizes are shared by phones with different
 * corners; the table takes the newer phone.
 */
export function displayCornerRadius(width: number, height: number): number | null {
  const key = `${Math.min(width, height)}x${Math.max(width, height)}`;
  return DISPLAY_CORNERS[key] ?? null;
}

const DISPLAY_CORNERS: Partial<Record<string, number>> = {
  // X, Xs, 11 Pro have 39; 12 mini and 13 mini, which report the same size, have 44.
  "375x812": 44,
  // Xr and 11 have 41.5; Xs Max and 11 Pro Max, which report the same size, have 39.
  "414x896": 41.5,
  // 12, 12 Pro, 13, 13 Pro, 14, 16e.
  "390x844": 47.33,
  // 12 Pro Max, 13 Pro Max, 14 Plus.
  "428x926": 53.33,
  // 14 Pro, 15, 15 Pro, 16.
  "393x852": 55,
  // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus.
  "430x932": 55,
  // 16 Pro, 17, 17 Pro.
  "402x874": 62,
  // Air.
  "420x912": 62,
  // 16 Pro Max, 17 Pro Max.
  "440x956": 62,
};

/** How much shorter than the layout viewport the visual viewport is when a keyboard is up. */
const KEYBOARD_THRESHOLD = 60;

/**
 * How much shorter than the screen a page that reaches the screen's bottom edge can be: the status
 * bar above it, which the installed app's `default` style keeps outside the page (at most about
 * 68pt). A browser's or a web view's bars take more: a bottom toolbar and the top bar together are
 * well over 100pt.
 */
const STATUS_BAR_MAX = 80;

export interface SheetViewportState {
  /** The visible part of the layout viewport, when a software keyboard covers the rest. */
  keyboard: { top: number; bottom: number } | null;
  /** The display's corner radius, when the sheet touches the bottom of the screen. */
  hug: number | null;
}

export interface ViewportMetrics {
  layoutWidth: number;
  layoutHeight: number;
  visual: { height: number; offsetTop: number; scale: number } | null;
  standalone: boolean;
  screen: { width: number; height: number };
}

/**
 * Where the sheet goes. iOS does not resize the layout viewport for the keyboard (it ignores
 * `interactive-widget=resizes-content`), so a fixed sheet stays under the keyboard; only the visual
 * viewport shrinks, and iOS may pan it down inside the layout viewport to reveal the focused field.
 * `keyboard` is the visible band, as distances from the top and the bottom of the layout viewport.
 * Chrome on Android resizes the layout viewport itself, so there `keyboard` stays null.
 */
export function sheetViewportState(metrics: ViewportMetrics): SheetViewportState {
  const { visual, layoutHeight } = metrics;
  const keyboard =
    visual !== null && visual.scale === 1 && layoutHeight - visual.height > KEYBOARD_THRESHOLD
      ? {
          top: Math.max(0, visual.offsetTop),
          bottom: Math.max(0, layoutHeight - Math.max(0, visual.offsetTop) - visual.height),
        }
      : null;
  // Only the installed app has no browser bar under the sheet. With the keyboard up the sheet sits
  // on the keyboard, away from the corners. `standalone` is not enough: iOS reports it for a Home
  // Screen app that shows a toolbar under the page, so the page must also reach the bottom edge.
  const radius = displayCornerRadius(metrics.screen.width, metrics.screen.height);
  const hug = metrics.standalone && keyboard === null && reachesBottom(metrics) ? radius : null;
  return { keyboard, hug };
}

/** The page is as tall as the screen, less at most a status bar: nothing is under it. */
function reachesBottom({ layoutWidth, layoutHeight, screen }: ViewportMetrics): boolean {
  // iOS reports the screen's size in portrait; the page's sides tell the orientation.
  const long = Math.max(screen.width, screen.height);
  const short = Math.min(screen.width, screen.height);
  const screenHeight = layoutWidth > layoutHeight ? short : long;
  return screenHeight - layoutHeight <= STATUS_BAR_MAX;
}

/** `window.visualViewport`, which jsdom lacks although its type says it is never undefined. */
function visualViewport(): VisualViewport | null {
  return (window.visualViewport as VisualViewport | null | undefined) ?? null;
}

function readMetrics(): ViewportMetrics {
  const visual = visualViewport();
  return {
    layoutWidth: window.innerWidth,
    layoutHeight: window.innerHeight,
    visual:
      visual === null
        ? null
        : { height: visual.height, offsetTop: visual.offsetTop, scale: visual.scale },
    standalone:
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      // iOS before 16.4 reports a Home Screen app only through `navigator.standalone`.
      (navigator as { standalone?: boolean }).standalone === true,
    screen: { width: window.screen.width, height: window.screen.height },
  };
}

/**
 * Keeps the sheet's viewport element on the visible band while a keyboard is up, and marks it when
 * the sheet touches the screen's bottom edge. Writes `--sheet-vv-top`, `--sheet-vv-bottom`,
 * `data-keyboard`, `data-hug` and `--display-radius`, synchronously in the viewport events, so Base
 * UI's keyboard alignment (a frame later) measures the moved sheet.
 *
 * A ref callback: React calls the returned cleanup when the element goes.
 */
export function trackSheetViewport(element: HTMLElement | null): (() => void) | undefined {
  if (element === null) return undefined;

  const update = () => {
    const { keyboard, hug } = sheetViewportState(readMetrics());
    if (keyboard === null) {
      element.style.removeProperty("--sheet-vv-top");
      element.style.removeProperty("--sheet-vv-bottom");
      delete element.dataset.keyboard;
    } else {
      element.style.setProperty("--sheet-vv-top", `${keyboard.top}px`);
      element.style.setProperty("--sheet-vv-bottom", `${keyboard.bottom}px`);
      element.dataset.keyboard = "";
    }
    if (hug === null) {
      element.style.removeProperty("--display-radius");
      delete element.dataset.hug;
    } else {
      element.style.setProperty("--display-radius", `${hug}px`);
      element.dataset.hug = "";
    }
  };

  update();
  const visual = visualViewport();
  visual?.addEventListener("resize", update);
  visual?.addEventListener("scroll", update);
  window.addEventListener("resize", update);
  return () => {
    visual?.removeEventListener("resize", update);
    visual?.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
  };
}
