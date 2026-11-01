import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

import { springs } from "@/components/motion";

import { EASE_OUT } from "./presence";

/** How far a step travels as it enters or leaves, in px: enough to read as a direction. */
const SHIFT = 20;

const moving: Variants = {
  enter: (direction: 1 | -1) => ({
    opacity: 0,
    transform: `translateX(${direction * SHIFT}px)`,
    filter: "blur(2px)",
  }),
  center: {
    opacity: 1,
    transform: "translateX(0px)",
    filter: "blur(0px)",
    transition: {
      transform: springs.morph,
      opacity: { duration: 0.22, ease: EASE_OUT },
      filter: { duration: 0.22, ease: EASE_OUT },
    },
  },
  exit: (direction: 1 | -1) => ({
    opacity: 0,
    transform: `translateX(${-direction * SHIFT}px)`,
    filter: "blur(2px)",
    transition: { duration: 0.14, ease: EASE_OUT },
  }),
};

const fading: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } },
};

/**
 * The motion of a step, by the direction in its `custom` (1: forward, -1: back): it comes in from
 * the side it lies on and leaves to the other side, or crossfades under reduced motion. The fields
 * of a Kind move the same way, from the side of their Kind in the segmented control.
 */
export function stepVariants(reduceMotion: boolean): Variants {
  return reduceMotion ? fading : moving;
}

/**
 * The steps of a sheet, after Family: the old step leaves fast with a blur, the new one comes in
 * from the side it lies on (forward from the right, back from the left), and the sheet's
 * MorphHeight carries the change of height. The leaving step pops out of the layout at once, so
 * the height moves toward the new step from the first frame. Under reduced motion, a crossfade.
 */
export function Steps({
  step,
  direction,
  focus,
  variants,
  children,
}: {
  step: string;
  /** 1: forward, -1: back. */
  direction: 1 | -1;
  /**
   * A selector of the element to focus in the new step, such as the button the person came back
   * to. Without it, the focus stays on the sheet (the old step's control is gone).
   */
  focus?: string | undefined;
  /** The motion of the steps, by the direction in `custom`. Default: the sideways step. */
  variants?: Variants | undefined;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion() === true;
  const root = useRef<HTMLDivElement>(null);
  const focusRef = useRef(focus);
  focusRef.current = focus;

  // Only on a change of step: when the sheet opens, the sheet places the focus itself.
  const focusedStep = useRef(step);
  useEffect(() => {
    if (focusedStep.current === step) return;
    focusedStep.current = step;
    const selector = focusRef.current;
    if (selector === undefined) return;
    root.current?.querySelector<HTMLElement>(`[data-step="${step}"] ${selector}`)?.focus();
  }, [step]);

  return (
    <div ref={root} className="relative">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={step}
          data-step={step}
          custom={direction}
          variants={variants ?? stepVariants(reduceMotion)}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
