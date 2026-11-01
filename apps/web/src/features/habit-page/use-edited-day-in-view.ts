import { animate, type AnimationPlaybackControls } from "motion";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, type RefObject } from "react";

import { springs } from "@/components/motion";
import { parseEntryRef, useSheetSearch } from "@/components/sheet-search";
import { useIsWide } from "@/components/use-media-query";

/** The room between the edited Day and the top edge of the sheet. */
const MARGIN_PX = 16;

/**
 * On a phone, the input sheet covers the lower half of the screen, often with the Day that it
 * edits: then each change would happen out of sight. While the sheet edits a Day of this habit,
 * the page gets room at its end and rises with the sheet's spring until the Day is just above the
 * sheet; when the sheet closes, the page comes back. On a desktop the input is a popover at the
 * square.
 *
 * The scroll is driven frame by frame, not with `behavior: "smooth"`: Motion restores the scroll
 * position while it measures an animation (the sheet's height), which cancels a native smooth
 * scroll.
 */
export function useEditedDayInView(page: RefObject<HTMLElement | null>, habitId: string) {
  const { entry } = useSheetSearch();
  const wide = useIsWide();
  const reduceMotion = useReducedMotion() === true;
  const editing = entry !== undefined && parseEntryRef(entry)?.habitId === habitId;
  const dropRoom = useRef<number | undefined>(undefined);
  const scroll = useRef<AnimationPlaybackControls | null>(null);

  useEffect(() => {
    const element = page.current;
    if (wide || !editing || entry === undefined || element === null) return;
    const scrollTo = (top: number) => {
      scroll.current?.stop();
      if (reduceMotion) {
        window.scrollTo(0, top);
        return;
      }
      // The person's own scroll wins over this one.
      const detach = () => {
        window.removeEventListener("wheel", stop);
        window.removeEventListener("touchstart", stop);
      };
      const stop = (event: Event) => {
        // A tap or a scroll inside the sheet is not a scroll of the page.
        if (event.target instanceof Element && event.target.closest(".sheet-popup") !== null)
          return;
        scroll.current?.stop();
        detach();
      };
      window.addEventListener("wheel", stop, { passive: true });
      window.addEventListener("touchstart", stop, { passive: true });
      scroll.current = animate(window.scrollY, top, {
        // In step with the input sheet, which comes up with the open spring.
        ...springs.open,
        onUpdate: (y) => window.scrollTo(0, y),
        onComplete: detach,
      });
    };
    const startY = window.scrollY;
    window.clearTimeout(dropRoom.current);
    element.dataset.editing = "";

    // The sheet mounts within a frame or two. `offsetTop` is where it comes to rest: it leaves out
    // the transform of its entrance.
    let frame = 0;
    let tries = 0;
    const reveal = () => {
      const sheet = document.querySelector<HTMLElement>(".sheet-popup");
      if (sheet === null) {
        if (++tries < 10) frame = requestAnimationFrame(reveal);
        return;
      }
      const square = element.querySelector(`[data-slot="0"] [data-entry="${CSS.escape(entry)}"]`);
      if (square === null) return;
      const { top, bottom } = square.getBoundingClientRect();
      const room = sheet.offsetTop - MARGIN_PX;
      // Never past the top of the screen.
      const delta = Math.min(bottom - room, top - MARGIN_PX);
      if (delta > 0) scrollTo(startY + delta);
    };
    frame = requestAnimationFrame(reveal);

    return () => {
      cancelAnimationFrame(frame);
      if (window.scrollY !== startY) scrollTo(startY);
      // The room goes after the sheet and the scroll have settled.
      dropRoom.current = window.setTimeout(() => delete element.dataset.editing, 600);
    };
  }, [editing, entry, page, reduceMotion, wide]);

  useEffect(() => () => scroll.current?.stop(), []);
}
