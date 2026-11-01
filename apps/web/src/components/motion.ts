import { spring, type Transition } from "motion";

/**
 * The motion grammar of the app, after Family: springs that settle quickly, a short overshoot
 * when a value rises, and sheets that change their height instead of cutting. Every screen uses
 * these presets, so the list, the habit page and the sheets move the same way.
 *
 * With `prefers-reduced-motion`, a fade replaces each movement: components read
 * `useReducedMotion()` from "motion/react" and skip transforms.
 */
export const springs = {
  /** The fill of a Day gauge: rises with a little bounce. */
  fill: { type: "spring", visualDuration: 0.38, bounce: 0.24 },
  /** A page that moves: the Month pager, the habit page beside the list. Nearly no bounce. */
  sheet: { type: "spring", visualDuration: 0.42, bounce: 0.1 },
  /** A bottom sheet that opens, and the sheet under it that comes back. Quick, nearly no bounce. */
  open: { type: "spring", visualDuration: 0.3, bounce: 0.08 },
  /** A sheet over a sheet (the icon and emoji pickers), and the step back of the one under it. */
  stack: { type: "spring", visualDuration: 0.18, bounce: 0 },
  /** A sheet that changes its height between steps. */
  morph: { type: "spring", visualDuration: 0.34, bounce: 0.12 },
  /** A row that lifts for a reorder, or settles after it. */
  lift: { type: "spring", visualDuration: 0.26, bounce: 0.18 },
  /**
   * The pulse of a square when its value rises. A physical spring, so it can start with a
   * velocity: from rest at scale 1, PULSE_VELOCITY carries it to about 1.04, and it settles.
   */
  pulse: { type: "spring", stiffness: 600, damping: 18, mass: 1 },
} as const satisfies Record<string, Transition>;

/** The start velocity of the pulse, in scale units per second (a peak of about 1.04). */
export const PULSE_VELOCITY = 1.6;

/**
 * The pulse as keyframes of `scale`: the pulse spring from rest at 1, with PULSE_VELOCITY, sampled
 * at 120 frames a second until it settles (about 330ms).
 */
const pulseFrames = (() => {
  const step = 1000 / 120;
  const generator = spring({ keyframes: [1, 1], velocity: PULSE_VELOCITY, ...springs.pulse });
  const values: number[] = [];
  for (let time = 0; time <= 2000; time += step) {
    const state = generator.next(time);
    values.push(state.value);
    if (state.done) break;
  }
  values[values.length - 1] = 1;
  return { values, duration: (values.length - 1) * step };
})();

/**
 * Plays the pulse on an element: a rising value springs it to about 1.04, and it settles. It is a
 * Web Animation of `transform`, which the browser can run off the main thread, so the pulse stays
 * smooth while the tap that caused it re-renders the screen. Motion's `scale` would run on the main
 * thread. A new pulse replaces the one that still runs. Nothing happens where Web Animations are
 * missing (jsdom).
 */
export function playPulse(element: HTMLElement): void {
  if (typeof element.animate !== "function") return;
  pulses.get(element)?.cancel();
  const animation = element.animate(
    pulseFrames.values.map((value) => ({ transform: `scale(${value})` })),
    { duration: pulseFrames.duration, easing: "linear" },
  );
  pulses.set(element, animation);
}

/** The pulse that each element plays, or played last. */
const pulses = new WeakMap<HTMLElement, Animation>();

/**
 * `--ease-out` of styles.css as a CSS easing string, for motion outside CSS: Web Animations
 * (`element.animate`) and dnd-kit's transitions.
 */
export const easeOut = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Durations of the plain (non-spring) transitions, in milliseconds. */
export const durations = {
  /** Press feedback on a control. */
  press: 120,
  /** A popover or a small dialog that enters or leaves. */
  pop: 180,
  /** A fade that replaces a movement under reduced motion. */
  fade: 180,
} as const;

/**
 * The fill spring as a CSS transition value ("380ms linear(…)"), for elements that animate in
 * CSS. Motion samples the same spring, so CSS and JS motion match.
 */
export const cssSprings = {
  fill: spring(springs.fill.visualDuration, springs.fill.bounce).toString(),
  sheet: spring(springs.sheet.visualDuration, springs.sheet.bounce).toString(),
  open: spring(springs.open.visualDuration, springs.open.bounce).toString(),
  stack: spring(springs.stack.visualDuration, springs.stack.bounce).toString(),
  morph: spring(springs.morph.visualDuration, springs.morph.bounce).toString(),
  lift: spring(springs.lift.visualDuration, springs.lift.bounce).toString(),
};

/**
 * The morph spring as the timing of a Web Animation (`element.animate`): its duration in
 * milliseconds and its `linear()` easing, for a motion of several elements that must stay in step.
 */
export const morphTiming = timingOf(cssSprings.morph);

function timingOf(css: string): { duration: number; easing: string } {
  const [duration = "", ...easing] = css.split(" ");
  return { duration: Number.parseFloat(duration), easing: easing.join(" ") };
}

/**
 * Puts the CSS springs on the document as custom properties (`--spring-fill`, `--spring-sheet`,
 * `--spring-open`, `--spring-stack`).
 * The sheet and the lift springs also come in their two parts (`--spring-sheet-duration` and
 * `--spring-sheet-easing`, and the same for `lift`), for an animation whose name is not the
 * author's (a view transition's group).
 */
export function installCssSprings(root: HTMLElement = document.documentElement): void {
  root.style.setProperty("--spring-fill", cssSprings.fill);
  root.style.setProperty("--spring-sheet", cssSprings.sheet);
  root.style.setProperty("--spring-open", cssSprings.open);
  root.style.setProperty("--spring-stack", cssSprings.stack);
  for (const name of ["sheet", "lift"] as const) {
    const [duration = "", ...easing] = cssSprings[name].split(" ");
    root.style.setProperty(`--spring-${name}-duration`, duration);
    root.style.setProperty(`--spring-${name}-easing`, easing.join(" "));
  }
}
