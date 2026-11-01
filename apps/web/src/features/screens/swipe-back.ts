import { animate } from "motion";

/** A touch that starts this close to the left edge swipes back also over a part with its own swipe. */
export const EDGE_PX = 24;
/** The finger has to move this far before the gesture picks a direction. */
const SLOP_PX = 10;
/** How much more sideways than vertical a move must be to swipe back. */
const SIDEWAYS_RATIO = 1.2;
/** A flick this fast to the right swipes back from any point; this fast to the left stays. */
const FLICK_PX_PER_MS = 0.35;
/** The samples of the finger that set its speed at the release. */
const VELOCITY_WINDOW_MS = 80;
/** How far the list sits to the left under the page, as a fraction of the screen. */
const UNDER_SHIFT = 0.3;

/**
 * What a move of the finger means, from where it started: too short to tell, a swipe back (to the
 * right, more sideways than vertical), or something else (a scroll, a swipe to the left).
 */
export function swipeIntent(dx: number, dy: number): "wait" | "back" | "other" {
  if (Math.hypot(dx, dy) < SLOP_PX) return "wait";
  return dx > 0 && dx > Math.abs(dy) * SIDEWAYS_RATIO ? "back" : "other";
}

/**
 * Whether a release completes the swipe: a flick decides by its direction, else the page has to be
 * past the middle of the screen. `progress` is from 0 to 1, `velocity` in px/ms (to the right is
 * positive).
 */
export function completesSwipe(progress: number, velocity: number): boolean {
  if (velocity >= FLICK_PX_PER_MS) return true;
  if (velocity <= -FLICK_PX_PER_MS) return false;
  return progress > 0.5;
}

export interface SwipeBackOptions {
  /** The list under the page: mount it, and return its element. */
  reveal: () => HTMLElement | null;
  /** The swipe went back: the page is off the screen. Change the route. */
  complete: () => void;
  /** The page came back into place: unmount the list. */
  restore: () => void;
}

/**
 * The swipe back from the page of a habit to the list, on a phone, as in an iOS app (iOS 26 takes
 * it from anywhere on the screen, not only from the edge). The page follows the finger to the
 * right and uncovers the list, which comes from a third of the way to the left and brightens, as in
 * the view transition of Back (screens.css). At the release a spring carries both on, with the
 * finger's speed: off the screen, then the route goes back; or back into place.
 *
 * A part of the page with its own sideways swipe (the calendar, the year grid, the months) keeps
 * it, except from the edge of the screen. Touch events, not pointer events: only they can stop the
 * scroll once the move turns out sideways. Returns the cleanup.
 */
export function trackSwipeBack(page: HTMLElement, options: SwipeBackOptions): () => void {
  let start: { x: number; y: number; id: number } | null = null;
  let swipe: {
    slop: number;
    list: HTMLElement;
    samples: { t: number; x: number }[];
  } | null = null;
  let busy = false;
  let x = 0;
  const width = () => window.innerWidth;
  const dim = () =>
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--screens-dim"),
    ) || 1;
  let dimmed = 1;

  const place = (list: HTMLElement) => {
    const progress = Math.min(1, Math.max(0, x / width()));
    page.style.translate = `${x}px 0`;
    list.style.translate = `${(progress - 1) * UNDER_SHIFT * 100}% 0`;
    list.style.filter = `brightness(${dimmed + (1 - dimmed) * progress})`;
  };

  const onStart = (event: TouchEvent) => {
    if (busy || event.touches.length !== 1) {
      start = null;
      return;
    }
    const touch = event.touches[0]!;
    const target = event.target instanceof Element ? event.target : null;
    if (touch.clientX > EDGE_PX && target?.closest("[data-own-swipe]") != null) {
      start = null;
      return;
    }
    start = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
  };

  const onMove = (event: TouchEvent) => {
    if (start === null) return;
    const touch = [...event.changedTouches].find((each) => each.identifier === start!.id);
    if (touch === undefined) return;
    const dx = touch.clientX - start.x;
    if (swipe === null) {
      const intent = swipeIntent(dx, touch.clientY - start.y);
      if (intent === "wait") return;
      // The browser has begun to scroll: the move is its own.
      if (intent === "other" || !event.cancelable) {
        start = null;
        return;
      }
      const list = options.reveal();
      if (list === null) {
        start = null;
        return;
      }
      dimmed = dim();
      swipe = { slop: dx, list, samples: [] };
    }
    event.preventDefault();
    x = Math.min(width(), Math.max(0, dx - swipe.slop));
    const now = event.timeStamp;
    swipe.samples.push({ t: now, x });
    swipe.samples = swipe.samples.filter((sample) => now - sample.t <= VELOCITY_WINDOW_MS);
    place(swipe.list);
  };

  const onEnd = (event: TouchEvent) => {
    if (start === null || ![...event.changedTouches].some((t) => t.identifier === start!.id)) {
      return;
    }
    start = null;
    if (swipe === null) return;
    const { list, samples } = swipe;
    swipe = null;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const velocity =
      event.type === "touchend" && first !== undefined && last !== undefined && last.t > first.t
        ? (last.x - first.x) / (last.t - first.t)
        : 0;
    const back = event.type === "touchend" && completesSwipe(x / width(), velocity);
    busy = true;
    void animate(x, back ? width() : 0, {
      type: "spring",
      visualDuration: 0.32,
      bounce: 0,
      velocity: velocity * 1000,
      onUpdate: (value) => {
        x = value;
        place(list);
      },
    }).then(() => {
      busy = false;
      if (back) {
        options.complete();
        return;
      }
      page.style.translate = "";
      list.style.translate = "";
      list.style.filter = "";
      options.restore();
    });
  };

  page.addEventListener("touchstart", onStart, { passive: true });
  page.addEventListener("touchmove", onMove, { passive: false });
  page.addEventListener("touchend", onEnd);
  page.addEventListener("touchcancel", onEnd);
  return () => {
    page.removeEventListener("touchstart", onStart);
    page.removeEventListener("touchmove", onMove);
    page.removeEventListener("touchend", onEnd);
    page.removeEventListener("touchcancel", onEnd);
  };
}
