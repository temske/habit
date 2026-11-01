import { Outlet, useCanGoBack, useMatch, useRouter } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { useIsWide } from "@/components/use-media-query";
import { HabitList } from "@/features/list/habit-list";
import { animateTraversals, skipNextTransition } from "@/features/screens/screen-transition";
import { trackSwipeBack } from "@/features/screens/swipe-back";

import "@/features/screens/screens.css";

/**
 * Where the window had scrolled the list on a phone when it was last on the screen: where the list
 * shows under a page that a swipe takes away, and where it is once the page has gone.
 */
let listScrollY = 0;

/**
 * The list and the page of a habit (`/` and `/habits/$habitId`). On a phone the page takes the
 * screen in place of the list. On a desktop it opens beside the list, and the list makes room for
 * it as the window narrows: it drops the Days first, then the names, and keeps the icons
 * (screens.css). Each of the two columns scrolls by itself, so the list keeps its place while pages
 * change beside it. A change between the list and a page plays a transition (screen-transition.ts).
 *
 * On a phone a swipe to the right takes the page away (swipe-back.ts). While it moves, the list
 * is under the page, at the place in the tree it has without a page, so the same list stays when
 * the route goes back. Both are fixed to the screen meanwhile, each scrolled where it was.
 */
export function Screens() {
  const wide = useIsWide();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  useEffect(() => animateTraversals(router), [router]);
  const habitId = useMatch({
    from: "/_screens/habits/$habitId",
    shouldThrow: false,
    select: (match) => match.params.habitId,
  });
  const open = habitId !== undefined;
  const beside = wide && open;
  const [under, setUnder] = useState(false);
  const underlay = under && open && !wide;
  const listRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const canGoBackRef = useRef(canGoBack);
  canGoBackRef.current = canGoBack;

  // A layout effect, so the listener is gone in the commit that leaves the list, before the new
  // page scrolls the window.
  useLayoutEffect(() => {
    if (wide || open) return;
    const onScroll = () => {
      listScrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [wide, open]);

  // The swipe has taken the page away: the list goes from under it into the flow, where it was.
  useLayoutEffect(() => {
    if (!under || open) return;
    listRef.current?.style.removeProperty("translate");
    listRef.current?.style.removeProperty("filter");
    window.scrollTo(0, listScrollY);
    setUnder(false);
  }, [under, open]);

  useEffect(() => {
    const page = pageRef.current;
    if (wide || page === null) return;
    let pageScrollY = 0;
    return trackSwipeBack(page, {
      reveal: () => {
        pageScrollY = window.scrollY;
        flushSync(() => setUnder(true));
        page.scrollTop = pageScrollY;
        if (listRef.current !== null) listRef.current.scrollTop = listScrollY;
        return listRef.current;
      },
      complete: () => {
        // The swipe was the motion: no transition after it.
        skipNextTransition();
        if (canGoBackRef.current) router.history.back();
        else void router.navigate({ to: "/" });
      },
      restore: () => {
        flushSync(() => setUnder(false));
        window.scrollTo(0, pageScrollY);
      },
    });
  }, [wide, habitId, router]);

  return (
    <div
      className="screens"
      data-split={beside ? "" : undefined}
      data-swipe={underlay ? "" : undefined}
    >
      {wide || !open || underlay ? (
        <div
          ref={listRef}
          className="screens-list"
          role={beside ? "navigation" : "main"}
          aria-label={beside ? "Habits" : undefined}
          aria-hidden={underlay ? true : undefined}
          inert={underlay}
        >
          <HabitList pageOpen={beside} />
        </div>
      ) : null}
      {open ? (
        <div ref={pageRef} key={habitId} className="screens-page">
          <Outlet />
        </div>
      ) : null}
    </div>
  );
}
