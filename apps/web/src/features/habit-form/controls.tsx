import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { HABIT_COLORS, type HabitColor } from "@habit/core";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useId, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";

import { springs } from "@/components/motion";
import { habitColorVar } from "@/components/palette";
import { cn } from "@/lib/utils";

import { EASE_OUT, FADE_IN, rowPresence } from "./presence";

/**
 * A field on the sheet, as DESIGN.md has it: the `field` fill, a capsule, an inset ring
 * in `ink-4` on focus, and 16px or more so iOS does not zoom.
 */
export const fieldClass =
  "h-12 w-full min-w-0 rounded-full bg-field px-5 text-ink outline-none transition-[box-shadow] duration-[120ms] placeholder:text-ink-3 focus-visible:shadow-[inset_0_0_0_0.09375rem_var(--ink-4)] focus-visible:outline-none";

/** The label of a group of controls, such as "Options". Quiet, never an eyebrow above a heading. */
export function SectionLabel({
  id,
  hidden,
  children,
}: {
  id?: string;
  /** Read by a screen reader only. */
  hidden?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={
        hidden === true ? "sr-only" : "mb-2 text-[0.875rem] font-medium leading-5 text-ink-3"
      }
    >
      {children}
    </div>
  );
}

/**
 * The message under a field, such as "Give the habit a name." It grows in with the sheet's height
 * and fades, calm: no red, no shake (docs/build-plan.md, "Errors").
 */
export function FieldMessage({ id, message }: { id: string; message: string | undefined }) {
  const reduceMotion = useReducedMotion() === true;
  return (
    <AnimatePresence initial={false}>
      {message === undefined ? null : (
        <motion.p
          key="message"
          id={id}
          role="status"
          className="text-[0.875rem] leading-5 text-ink-2"
          {...rowPresence(reduceMotion)}
        >
          <span className="block pt-1.5">{message}</span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** A short line under the label, such as "Do less". */
  hint?: string;
}

/**
 * A segmented control (a radio group): a pill slides to the chosen segment with the lift spring.
 * Arrow keys move the choice, as in any radio group. Under reduced motion the pill fades in place.
 */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled,
  tall,
  hideLabel,
  className,
}: {
  label: string;
  hideLabel?: boolean;
  className?: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  disabled?: boolean;
  /** Two lines in a segment: the icon over the label, or the label over its hint. */
  tall?: boolean;
}) {
  const labelId = useId();
  const pillId = useId();
  const hintId = useId();
  const reduceMotion = useReducedMotion() === true;
  return (
    <div className={className}>
      <SectionLabel id={labelId} hidden={hideLabel}>
        {label}
      </SectionLabel>
      <RadioGroup
        aria-labelledby={labelId}
        value={value}
        onValueChange={(next) => onChange(next as T)}
        disabled={disabled}
        className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-full bg-surface-2 p-0.5"
      >
        {options.map((option) => (
          <Radio.Root
            key={option.value}
            value={option.value}
            aria-describedby={option.hint === undefined ? undefined : `${hintId}-${option.value}`}
            className={cn(
              "relative isolate flex min-w-0 touch-manipulation select-none items-center justify-center rounded-full text-ink-3 transition-[color,scale] duration-150 ease-out data-checked:text-ink active:scale-[0.97] data-disabled:active:scale-100",
              tall ? "h-14 flex-col gap-0.5" : "h-10 gap-1.5",
            )}
          >
            {option.value === value ? (
              <motion.span
                layoutId={reduceMotion ? undefined : pillId}
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full bg-surface shadow-[0_0.0625rem_0.1875rem_oklch(0_0_0/0.1)] dark:bg-surface-3"
                initial={reduceMotion ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={reduceMotion ? FADE_IN : springs.lift}
              />
            ) : null}
            {option.icon === undefined ? null : (
              <span className="grid [&>svg]:size-[1.125rem]" aria-hidden>
                {option.icon}
              </span>
            )}
            <span
              className={cn(
                "truncate font-medium",
                tall && option.icon !== undefined
                  ? "text-[0.8125rem] leading-4"
                  : "text-[0.9375rem] leading-5",
              )}
            >
              {option.label}
            </span>
            {option.hint === undefined ? null : (
              <span
                id={`${hintId}-${option.value}`}
                aria-hidden
                className="truncate text-[0.8125rem] leading-4 text-ink-3"
              >
                {option.hint}
              </span>
            )}
          </Radio.Root>
        ))}
      </RadioGroup>
    </div>
  );
}

const COLOR_NAMES: Record<HabitColor, string> = Object.fromEntries(
  HABIT_COLORS.map((color) => [color, color[0]!.toUpperCase() + color.slice(1)]),
) as Record<HabitColor, string>;

/** The 16 colors of the palette as squircle swatches, 8 on a row. */
export function ColorSwatches({
  value,
  onChange,
}: {
  value: HabitColor;
  onChange: (color: HabitColor) => void;
}) {
  const labelId = useId();
  return (
    <div>
      <SectionLabel id={labelId} hidden>
        Color
      </SectionLabel>
      <RadioGroup
        aria-labelledby={labelId}
        value={value}
        onValueChange={(next) => onChange(next as HabitColor)}
        className="-mx-1 grid grid-cols-8"
      >
        {HABIT_COLORS.map((color) => (
          <Radio.Root
            key={color}
            value={color}
            aria-label={COLOR_NAMES[color]}
            className="group grid aspect-square min-h-10 touch-manipulation place-items-center"
            style={{ "--c": habitColorVar(color) } as CSSProperties}
          >
            <span className="grid size-[72%] place-items-center squircle-[0.5rem] bg-habit text-ground shadow-[0_0_0_0_color-mix(in_oklab,var(--c)_50%,transparent)] transition-[box-shadow,scale] duration-150 ease-out group-active:scale-[0.95] group-data-checked:shadow-[0_0_0_0.25rem_color-mix(in_oklab,var(--c)_50%,transparent)]">
              <CheckIcon
                weight="bold"
                aria-hidden
                className="size-[46%] opacity-0 transition-opacity duration-150 group-data-checked:opacity-100"
              />
            </span>
          </Radio.Root>
        ))}
      </RadioGroup>
    </div>
  );
}

/**
 * A button of the sheet (DESIGN.md, "Buttons"). The primary one, the single action that ends a
 * step, is solid `ink` on `ground`; the quiet one is the usual `surface-2` button; the destructive
 * one is tinted with `destructive`, its text mixed with `ink` so it keeps its contrast.
 */
export function SheetButton({
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "destructive";
}) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-[0.9375rem] font-semibold tracking-[-0.01em] transition-[scale,background-color,opacity] duration-[120ms] ease-out active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100",
        variant === "primary"
          ? "bg-ink text-ground"
          : variant === "destructive"
            ? "bg-[color-mix(in_oklab,var(--destructive)_12%,var(--surface))] text-[color-mix(in_oklab,var(--destructive)_70%,var(--ink))] hover:bg-[color-mix(in_oklab,var(--destructive)_18%,var(--surface))] active:bg-[color-mix(in_oklab,var(--destructive)_18%,var(--surface))]"
            : "bg-surface-2 text-ink hover:bg-surface-3 active:bg-surface-3",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** How far a label of the footer button travels as it changes, in px. */
const LABEL_SHIFT = 12;

const rolling: Variants = {
  enter: (direction: 1 | -1) => ({
    opacity: 0,
    transform: `translateY(${direction * LABEL_SHIFT}px)`,
    filter: "blur(2px)",
  }),
  center: {
    opacity: 1,
    transform: "translateY(0px)",
    filter: "blur(0px)",
    transition: {
      transform: springs.morph,
      opacity: { duration: 0.22, ease: EASE_OUT },
      filter: { duration: 0.22, ease: EASE_OUT },
    },
  },
  exit: (direction: 1 | -1) => ({
    opacity: 0,
    transform: `translateY(${-direction * LABEL_SHIFT}px)`,
    filter: "blur(2px)",
    transition: { duration: 0.14, ease: EASE_OUT },
  }),
};

const crossfading: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: FADE_IN },
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } },
};

/**
 * The one button of a sheet's footer, for every step: it stays in place while the steps change
 * above it. Its fill turns into the new variant's, and its label rolls: the old one leaves upward
 * and the new one comes from below, the other way round on the way back, as the steps move
 * sideways. Under reduced motion the label crossfades.
 */
export function StepButton({
  label,
  variant,
  direction,
  onClick,
}: {
  label: string;
  variant: "primary" | "quiet";
  /** 1: the step went forward, -1: back. */
  direction: 1 | -1;
  onClick: () => void;
}) {
  const reduceMotion = useReducedMotion() === true;
  return (
    <SheetButton
      variant={variant}
      onClick={onClick}
      aria-label={label}
      className="relative w-full overflow-hidden transition-[scale,background-color,color] duration-[120ms,200ms,200ms]"
    >
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.span
          key={label}
          aria-hidden
          custom={direction}
          variants={reduceMotion ? crossfading : rolling}
          initial="enter"
          animate="center"
          exit="exit"
          className="block whitespace-nowrap"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </SheetButton>
  );
}

/**
 * The buttons at the end of a step. They stick to the bottom of the sheet while the content above
 * scrolls (a long list of Options, a short desktop window, an open keyboard), so the main action
 * is always in reach. What passes under them is cut at the top edge of the button, as under the
 * sheet's footer.
 */
export function StickyFooter({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 z-10 -mx-5 -mb-5 bg-surface px-5 pb-5">{children}</div>;
}

/**
 * The width of a habit form's dialog: 25rem, so 8 color swatches and the Option rows have room,
 * and two columns of 20rem where the window has room for them (960px and more; see FormColumns).
 */
export const FORM_SHEET_CLASS = "sm:w-[min(25rem,100%)] min-[60rem]:w-[min(44.5rem,100%)]";

/**
 * The two halves of a habit form: what the habit looks like (the icon, the name, the color) and
 * how it is tracked (the Direction, the Kind and its fields). In a window of 960px and more they
 * stand side by side, so the dialog fits without a scroll; a narrower window stacks them.
 */
export function FormColumns({ looks, tracking }: { looks: ReactNode; tracking: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 min-[60rem]:grid min-[60rem]:grid-cols-2 min-[60rem]:items-start min-[60rem]:gap-x-8">
      <div className="flex min-w-0 flex-col gap-5">{looks}</div>
      {/* `relative`: the fields of a Kind that leave are placed in it while they go. */}
      <div className="relative flex min-w-0 flex-col gap-5">{tracking}</div>
    </div>
  );
}
