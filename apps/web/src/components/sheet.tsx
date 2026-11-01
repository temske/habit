import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "@base-ui/react/drawer";
import { Popover } from "@base-ui/react/popover";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { springs } from "@/components/motion";
import { trackSheetViewport } from "@/components/sheet-viewport";
import { dimThemeColor } from "@/components/theme-color";
import { useIsWide } from "@/components/use-media-query";
import { cn } from "@/lib/utils";

export type InitialFocus = NonNullable<Dialog.Popup.Props["initialFocus"]>;

export interface ResponsiveSheetProps {
  open: boolean;
  /** Called with false when the person dismisses the sheet (swipe, backdrop, Escape, close button). */
  onOpenChange: (open: boolean) => void;
  /** The accessible name, shown as the heading unless `hideTitle`. */
  title: ReactNode;
  hideTitle?: boolean;
  description?: ReactNode;
  /** On a desktop: a centered dialog (the default), or a popover at `anchor`. */
  desktop?: "dialog" | "popover";
  /** The element the desktop popover points at. Without one, the popover becomes a dialog. */
  anchor?: Element | null;
  /** Called when the close animation has finished: the moment to drop retained content. */
  onExitComplete?: () => void;
  /**
   * What to focus when the sheet opens (Base UI's `initialFocus`): an element, `false` to keep
   * focus where it is, or a function of the interaction type (`touch`, `mouse`, `keyboard`).
   * Default: the first focusable element.
   */
  initialFocus?: InitialFocus;
  /**
   * The buttons that end the sheet. They stay at the bottom while the content above changes its
   * height or scrolls, so the main action never moves.
   */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * One sheet for every form and input: a bottom sheet on a phone (swipe down to dismiss), and on a
 * desktop a centered dialog or a popover at an element. The content changes its height with a
 * spring instead of a cut, so a sheet can move between steps (as in Family).
 *
 * The URL owns `open` (`?new`, `?edit`, `?entry`, `?monthPicker`): pass `open` from the search
 * params and close with `useCloseSheet()`, so the back gesture closes the sheet too.
 */
export function ResponsiveSheet(props: ResponsiveSheetProps) {
  const wide = useIsWide();
  // Base UI plays the enter transition only when `open` turns true after the root has mounted. A
  // sheet that mounts already open (its search param came with a tap or with the URL) would appear
  // in place, without the slide: keep it closed for the first commit.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shown = { ...props, open: props.open && mounted };
  if (!wide) return <BottomSheet {...shown} />;
  if (props.desktop === "popover" && props.anchor) return <AnchoredPopover {...shown} />;
  return <CenteredDialog {...shown} />;
}

function BottomSheet({
  open,
  onOpenChange,
  title,
  hideTitle,
  description,
  onExitComplete,
  initialFocus,
  footer,
  className,
  children,
}: ResponsiveSheetProps) {
  // The installed app's status bar is outside the page: tint it with the scrim.
  useEffect(() => (open ? dimThemeColor() : undefined), [open]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onExitComplete?.();
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="sheet-backdrop" />
        {/* What Safari 26 samples for the color of its bars at the top and the bottom edge. */}
        {open ? (
          <>
            <div className="sheet-edge" data-edge="top" aria-hidden />
            <div className="sheet-edge" data-edge="bottom" aria-hidden />
          </>
        ) : null}
        <Drawer.Viewport className="sheet-viewport" ref={trackSheetViewport}>
          <Drawer.VirtualKeyboardProvider>
            <Drawer.Popup
              className={cn("sheet-popup", className)}
              {...(initialFocus === undefined ? {} : { initialFocus })}
            >
              <div className="sheet-handle" aria-hidden />
              <Drawer.Content className="sheet-content">
                <MorphHeight>
                  <SheetHeader
                    title={<Drawer.Title className={titleClass(hideTitle)}>{title}</Drawer.Title>}
                    description={
                      description === undefined ? null : (
                        <Drawer.Description className="sheet-description">
                          {description}
                        </Drawer.Description>
                      )
                    }
                    close={
                      <Drawer.Close className="sheet-close" aria-label="Close">
                        <XIcon weight="bold" />
                      </Drawer.Close>
                    }
                  />
                  <div className="sheet-body">{children}</div>
                </MorphHeight>
                <SheetFooter footer={footer} />
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.VirtualKeyboardProvider>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function CenteredDialog({
  open,
  onOpenChange,
  title,
  hideTitle,
  description,
  onExitComplete,
  initialFocus,
  footer,
  className,
  children,
}: ResponsiveSheetProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onExitComplete?.();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Viewport className="dialog-viewport">
          <Dialog.Popup
            className={cn("dialog-popup", className)}
            {...(initialFocus === undefined ? {} : { initialFocus })}
          >
            <MorphHeight>
              <SheetHeader
                title={<Dialog.Title className={titleClass(hideTitle)}>{title}</Dialog.Title>}
                description={
                  description === undefined ? null : (
                    <Dialog.Description className="sheet-description">
                      {description}
                    </Dialog.Description>
                  )
                }
                close={
                  <Dialog.Close className="sheet-close" aria-label="Close">
                    <XIcon weight="bold" />
                  </Dialog.Close>
                }
              />
              <div className="sheet-body">{children}</div>
            </MorphHeight>
            <SheetFooter footer={footer} />
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AnchoredPopover({
  open,
  onOpenChange,
  title,
  hideTitle,
  description,
  anchor,
  onExitComplete,
  initialFocus,
  footer,
  className,
  children,
}: ResponsiveSheetProps) {
  return (
    <Popover.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onExitComplete?.();
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchor ?? null}
          side="bottom"
          align="center"
          sideOffset={10}
          collisionPadding={16}
          className="z-50"
        >
          <Popover.Popup
            className={cn("popover-popup", className)}
            {...(initialFocus === undefined ? {} : { initialFocus })}
          >
            <MorphHeight>
              <SheetHeader
                title={<Popover.Title className={titleClass(hideTitle)}>{title}</Popover.Title>}
                description={
                  description === undefined ? null : (
                    <Popover.Description className="sheet-description">
                      {description}
                    </Popover.Description>
                  )
                }
                close={
                  <Popover.Close className="sheet-close" aria-label="Close">
                    <XIcon weight="bold" />
                  </Popover.Close>
                }
              />
              <div className="sheet-body">{children}</div>
            </MorphHeight>
            <SheetFooter footer={footer} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SheetHeader({
  title,
  description,
  close,
}: {
  title: ReactNode;
  description: ReactNode;
  close: ReactNode;
}) {
  return (
    <div className="sheet-header">
      <div className="sheet-heading">
        {title}
        {description}
      </div>
      {close}
    </div>
  );
}

/** Outside the MorphHeight, so the height changes above it. */
function SheetFooter({ footer }: { footer: ReactNode }) {
  if (footer === undefined || footer === null) return null;
  return <div className="sheet-footer">{footer}</div>;
}

function titleClass(hidden: boolean | undefined): string {
  return hidden === true ? "sr-only" : "sheet-title";
}

/**
 * Animates its height to its content's height with the morph spring, so a sheet grows and shrinks
 * between steps instead of jumping. Under reduced motion the height changes at once.
 */
export function MorphHeight({ children, className }: { children: ReactNode; className?: string }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const reduceMotion = useReducedMotion() === true;

  useLayoutEffect(() => {
    const element = inner.current;
    if (element === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const size = entry?.borderBoxSize[0]?.blockSize;
      if (size !== undefined) setHeight(size);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      // `clip`, not `hidden`: it clips the same, but it is not a scroll container, so a sticky
      // footer inside sticks to the sheet's own scroll.
      className={cn("overflow-clip", className)}
      initial={false}
      animate={{ height }}
      transition={reduceMotion ? { duration: 0 } : springs.morph}
    >
      <div ref={inner}>{children}</div>
    </motion.div>
  );
}
