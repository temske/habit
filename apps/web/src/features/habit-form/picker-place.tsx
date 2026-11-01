import { Popover } from "@base-ui/react/popover";
import type { HabitColor, HabitIcon as HabitIconValue, Option, OptionId } from "@habit/core";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useCallback, useRef, useState, type ReactNode, type RefObject } from "react";

import { useVariant } from "@/components/lab";
import { springs } from "@/components/motion";
import { ResponsiveSheet } from "@/components/sheet";

import { IconPicker, OptionEmojiPicker, type PickerSize } from "./icon-picker";
import { EASE_OUT, FADE_IN, FADE_OUT } from "./presence";

/**
 * Where the icon picker and the emoji picker of an Option open (a lab choice, `icon-picker-place`):
 *
 * - "Stacked sheet", what production ships: a second sheet over the form, which steps back, dims
 *   and shows its top edge above the picker, as a sheet under a sheet does on iOS.
 * - "Inline": the picker unfolds under the button that opened it, and the rest of the form stays.
 * - "Popover": a compact picker at the button.
 * - "Step": the picker replaces the form as a step of the sheet, and zooms out of the button.
 */
export const PICKER_PLACES = ["Stacked sheet", "Inline", "Popover", "Step"] as const;
export type PickerPlace = (typeof PICKER_PLACES)[number];

export function usePickerPlace(): PickerPlace {
  return useVariant("icon-picker-place", { label: "Icon picker", options: PICKER_PLACES });
}

/** What a picker is open for: the habit's icon, or the emoji of an Option. */
export type PickerTarget = { type: "icon" } | { type: "emoji"; id: OptionId };

/** The button that opens the picker for the target, in the form. */
export function triggerSelector(target: PickerTarget): string {
  return target.type === "icon"
    ? 'button[aria-label="Change icon"]'
    : `button[data-option-emoji="${target.id}"]`;
}

function sameTarget(a: PickerTarget | null, b: PickerTarget): boolean {
  return a?.type === b.type && (a.type === "icon" || a.id === (b as { id: OptionId }).id);
}

export interface PickerState {
  place: PickerPlace;
  /** The open picker, or null. */
  target: PickerTarget | null;
  /** The button that opened it: where the popover points. */
  anchor: HTMLElement | null;
  /** Opens the picker for the target. Inline, a second tap on the same button closes it. */
  open: (target: PickerTarget) => void;
  /** Closes the picker. The focus goes back to the button that opened it. */
  close: () => void;
  /** The picker for the target is unfolded in the form (the "Inline" place). */
  unfolded: (target: PickerTarget) => boolean;
}

/**
 * The state of the pickers of a form. `root` holds the form, where the buttons that open a picker
 * are. As a step, the sheet's Steps return the focus; elsewhere the form stays mounted, and the
 * focus goes back to the button once the picker is closed.
 */
export function usePicker(root: RefObject<HTMLElement | null>): PickerState {
  const place = usePickerPlace();
  const [target, setTarget] = useState<PickerTarget | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const open = useCallback(
    (next: PickerTarget) => {
      setAnchor(root.current?.querySelector<HTMLElement>(triggerSelector(next)) ?? null);
      setTarget((current) => (place === "Inline" && sameTarget(current, next) ? null : next));
    },
    [root, place],
  );

  const close = useCallback(() => {
    setTarget((current) => {
      if (current !== null && place !== "Step") {
        const selector = triggerSelector(current);
        requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(selector)?.focus());
      }
      return null;
    });
  }, [root, place]);

  const unfolded = (of: PickerTarget) => place === "Inline" && sameTarget(target, of);

  return { place, target, anchor, open, close, unfolded };
}

export interface PickerFormProps {
  icon: HabitIconValue;
  color: HabitColor;
  options: Option[];
  onPickIcon: (icon: HabitIconValue) => void;
  onPickEmoji: (id: OptionId, emoji: string | undefined) => void;
  /** Focus the search: on a desktop, where no keyboard covers the grid. */
  autoFocus: boolean;
}

/** The picker for a target: the icon picker, or the emoji picker of that Option. */
export function PickerFor({
  target,
  size,
  form,
}: {
  target: PickerTarget;
  size: PickerSize;
  form: PickerFormProps;
}) {
  if (target.type === "icon") {
    return (
      <IconPicker
        value={form.icon}
        color={form.color}
        onPick={form.onPickIcon}
        autoFocus={form.autoFocus}
        size={size}
      />
    );
  }
  return (
    <OptionEmojiPicker
      emoji={form.options.find((option) => option.id === target.id)?.emoji}
      color={form.color}
      onPick={(emoji) => form.onPickEmoji(target.id, emoji)}
      autoFocus={form.autoFocus}
      size={size}
    />
  );
}

/**
 * The inline picker: it unfolds under its button with the morph spring, as a row of the form
 * does, and folds away after a pick. The form below moves down with it; nothing else changes.
 * Escape folds it without closing the sheet. Under reduced motion, a fade.
 */
export function InlinePicker({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion() === true;
  const picker = useRef<HTMLDivElement>(null);
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="picker"
          {...unfold(reduceMotion)}
          // Once it is open, the whole picker comes into the sheet's view, clear of the footer.
          className="scroll-mb-24"
          onAnimationComplete={(definition) => {
            // The exit (to an opacity of 0) of a picker that folds away.
            if ((definition as { opacity?: number }).opacity === 0) return;
            picker.current?.scrollIntoView({
              block: "nearest",
              behavior: reduceMotion ? "auto" : "smooth",
            });
          }}
          ref={picker}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }}
        >
          <motion.div
            className="pt-3"
            initial={
              reduceMotion ? false : { transform: "translateY(-0.5rem)", filter: "blur(2px)" }
            }
            animate={{
              transform: "translateY(0rem)",
              filter: "blur(0px)",
              transition: { transform: springs.morph, filter: { duration: 0.22, ease: EASE_OUT } },
            }}
            exit={
              reduceMotion
                ? {}
                : {
                    transform: "translateY(-0.5rem)",
                    filter: "blur(2px)",
                    transition: { duration: 0.14, ease: EASE_OUT },
                  }
            }
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function unfold(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: FADE_IN },
      exit: { opacity: 0, transition: FADE_OUT },
    } as const;
  }
  return {
    initial: { opacity: 0, height: 0, overflow: "hidden" },
    animate: {
      opacity: 1,
      height: "auto",
      transitionEnd: { overflow: "visible" },
      transition: { height: springs.morph, opacity: { duration: 0.22, ease: EASE_OUT } },
    },
    exit: {
      opacity: 0,
      height: 0,
      overflow: "hidden",
      transition: { height: springs.morph, opacity: { duration: 0.14, ease: EASE_OUT } },
    },
  } as const;
}

/**
 * The pickers that float over the form: a stacked sheet, or a popover at the button. Each keeps
 * its content while it animates out. For the other places it renders nothing.
 */
export function FloatingPicker({
  picker,
  render,
}: {
  picker: PickerState;
  render: (target: PickerTarget, size: PickerSize) => ReactNode;
}) {
  const { place, target, anchor, close } = picker;
  const [shown, setShown] = useState(target);
  if (target !== null && target !== shown) setShown(target);
  const content = target ?? shown;
  const title = content?.type === "emoji" ? "Emoji" : "Icon";

  if (place === "Stacked sheet") {
    return (
      <ResponsiveSheet
        open={target !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
        title={title}
        nested
        className="sm:w-[min(25rem,100%)]"
      >
        {content === null ? null : render(content, "sheet")}
      </ResponsiveSheet>
    );
  }

  if (place === "Popover") {
    return (
      <Popover.Root
        open={target !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
      >
        <Popover.Portal>
          <Popover.Positioner
            anchor={anchor}
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className="z-[60]"
          >
            <Popover.Popup
              className="popover-popup w-[min(21rem,calc(100vw-1.5rem))] px-3 pt-3 dark:outline dark:outline-line-strong"
              initialFocus={false}
            >
              <Popover.Title className="sr-only">{title}</Popover.Title>
              {content === null ? null : render(content, "popover")}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return null;
}

/**
 * The motion of a picker as a step: it zooms out of the button that opened it (`origin`, in the
 * step's box) and back into it, while the form fades and settles from a little larger, as an app
 * opens from its icon. Under reduced motion, a crossfade.
 */
export function zoomVariants(reduceMotion: boolean, origin: string): Variants {
  if (reduceMotion) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1, transition: FADE_IN },
      exit: { opacity: 0, transition: FADE_OUT },
    };
  }
  // 1: into the picker, -1: back to the form. The picker is the small one.
  return {
    enter: (direction: 1 | -1) => ({
      opacity: 0,
      scale: direction === 1 ? 0.85 : 1.03,
      filter: "blur(2px)",
      transformOrigin: origin,
    }),
    center: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        scale: springs.morph,
        opacity: { duration: 0.2, ease: EASE_OUT },
        filter: { duration: 0.2, ease: EASE_OUT },
      },
    },
    exit: (direction: 1 | -1) => ({
      opacity: 0,
      scale: direction === 1 ? 1.03 : 0.85,
      filter: "blur(2px)",
      transformOrigin: origin,
      transition: { duration: 0.16, ease: EASE_OUT },
    }),
  };
}
