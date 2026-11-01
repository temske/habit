import type { HabitColor } from "@habit/core";
import { animate } from "motion";
import { useReducedMotion } from "motion/react";
import {
  memo,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { durations, easeOut, PULSE_VELOCITY, springs } from "@/components/motion";
import { habitColorVar } from "@/components/palette";
import { cn } from "@/lib/utils";

export interface DaySquareProps extends HTMLAttributes<HTMLSpanElement> {
  color: HabitColor;
  /** How full the Day is, from 0 (no Entry: the frame alone) to 1 (solid). See `intensity`. */
  intensity: number;
  /** The side, as a CSS length. Default: `var(--square)` (30px on a phone). */
  size?: string;
  /**
   * - `day`: a Day of a habit (the default).
   * - `ghost`: dashed and empty, for a habit that does not exist yet (the page of a missing habit).
   */
  variant?: "day" | "ghost";
  /**
   * - `frame`: a frame in the habit color around the fill (the default).
   * - `fill`: no frame; an empty Day is a quiet tile, and the gauge fills over a tint of the habit
   *   color.
   * - `flat`: no fill; the whole square takes the habit color, the stronger the fuller the Day.
   */
  look?: "frame" | "fill" | "flat";
  /**
   * An Entry exists. With an intensity of 0 (a recorded zero, such as 0 cigarettes) the frame
   * takes the habit color, so a recorded zero differs from a Day with no data.
   */
  recorded?: boolean;
  /** Animate changes of the intensity. Turn it off for large static grids. Default: true. */
  animated?: boolean;
  /**
   * Content in the center, where space permits (for example the emoji of a choice). The part over
   * the fill takes the ground color.
   */
  label?: ReactNode;
}

/**
 * The gauge of one Day: a squircle frame in the habit color that fills from the bottom. When the
 * intensity rises, the fill springs up and the square pulses to about 1.04; when it falls, the
 * fill drains without a pulse. Under reduced motion the new fill fades in instead.
 *
 * It is only the picture: the screens wrap it in their own button, with a touch target of about
 * 44px, and their own gestures.
 */
export const DaySquare = memo(function DaySquare({
  color,
  intensity,
  size,
  variant = "day",
  look = "frame",
  recorded = false,
  animated = true,
  label,
  className,
  style,
  ...rest
}: DaySquareProps) {
  const p = variant === "day" ? clamp01(intensity) : 0;
  const state =
    p >= 1 ? "full" : p > 0 ? "partial" : recorded && variant === "day" ? "zero" : "empty";
  const squareRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const previous = useRef(p);
  const reduceMotion = useReducedMotion() === true;

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = p;
    if (!animated || p === before) return;
    const square = squareRef.current;
    const fill = fillRef.current;
    if (square === null || fill === null) return;
    // A value that rises springs up; one that falls drains faster, without a bounce.
    square.dataset.trend = p > before ? "up" : "down";
    if (reduceMotion) {
      fill.animate([{ opacity: 0.35 }, { opacity: 1 }], {
        duration: durations.fade,
        easing: easeOut,
      });
      return;
    }
    if (p > before) {
      // A spring from rest at 1 back to 1, started with a velocity: it overshoots and settles.
      animate(square, { scale: 1 }, { ...springs.pulse, velocity: PULSE_VELOCITY });
    }
  }, [p, animated, reduceMotion]);

  return (
    <span
      ref={squareRef}
      aria-hidden={rest["aria-label"] === undefined ? true : undefined}
      {...rest}
      className={cn("day-square", className)}
      data-state={state}
      data-variant={variant}
      data-look={look}
      data-animated={animated}
      style={
        {
          "--c": habitColorVar(color),
          "--p": p,
          ...(size === undefined ? {} : { "--ds-size": size }),
          ...style,
        } as CSSProperties
      }
    >
      <span ref={fillRef} className="day-square-fill" style={{ transform: `scaleY(${p})` }} />
      {label === undefined ? null : (
        <>
          <span className="day-square-label">{label}</span>
          <span className="day-square-label" data-on-fill="">
            {label}
          </span>
        </>
      )}
    </span>
  );
});

function clamp01(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value >= 1 ? 1 : value;
}
