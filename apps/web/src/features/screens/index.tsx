import { Outlet, useMatch, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { useIsWide } from "@/components/use-media-query";
import { HabitList } from "@/features/list/habit-list";
import { animateTraversals } from "@/features/screens/screen-transition";

import "@/features/screens/screens.css";

/**
 * The list and the page of a habit (`/` and `/habits/$habitId`). On a phone the page takes the
 * screen in place of the list. On a desktop it opens beside the list, and the list makes room for
 * it as the window narrows: it drops the Days first, then the names, and keeps the icons
 * (screens.css). Each of the two columns scrolls by itself, so the list keeps its place while pages
 * change beside it. A change between the list and a page plays a transition (screen-transition.ts).
 */
export function Screens() {
  const wide = useIsWide();
  const router = useRouter();
  useEffect(() => animateTraversals(router), [router]);
  const habitId = useMatch({
    from: "/_screens/habits/$habitId",
    shouldThrow: false,
    select: (match) => match.params.habitId,
  });
  const open = habitId !== undefined;
  const beside = wide && open;

  return (
    <div className="screens" data-split={beside ? "" : undefined}>
      {wide || !open ? (
        <div
          className="screens-list"
          role={beside ? "navigation" : "main"}
          aria-label={beside ? "Habits" : undefined}
        >
          <HabitList pageOpen={beside} />
        </div>
      ) : null}
      {open ? (
        <div key={habitId} className="screens-page">
          <Outlet />
        </div>
      ) : null}
    </div>
  );
}
