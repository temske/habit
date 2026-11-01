import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { RowsIcon } from "@phosphor-icons/react/dist/csr/Rows";
import { Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { springs } from "@/components/motion";
import { useOpenSheet, useSheetSearch } from "@/components/sheet-search";

import "@/features/dock/dock.css";

/** The screens of the app's top level: each is a tab of the dock. */
export type DockTab = "habits" | "settings";

const TABS: {
  tab: DockTab;
  to: LinkProps["to"];
  label: string;
  Icon: typeof RowsIcon;
}[] = [
  { tab: "habits", to: "/", label: "Habits", Icon: RowsIcon },
  { tab: "settings", to: "/settings", label: "Settings", Icon: GearSixIcon },
];

/**
 * The dock: the navigation of the app's top level, over the bottom edge of the screen, near the
 * thumb. A pill with a tab for each screen (Habits, Settings), and "New habit" beside it, a circle
 * of `ink`. It is the last thing in its screen. On a phone it is fixed to the bottom of the screen,
 * so the rubber band at the end of a scroll does not move it, and a room as tall as the dock ends
 * the screen; on a desktop it sticks to the bottom of the list's column. The content scrolls under
 * it and fades out above it.
 *
 * A tab changes the screen in place, with no entry in the history, so the back gesture never walks
 * through the tabs. The screen changes at once: the raised pill slides to the new tab, and the new
 * screen's content comes in a little from the side of its tab (`useTabEnter`, dock.css). It is not
 * a view transition: one takes every tap while it runs, so fast taps on the tabs were lost. On a
 * keyboard, N opens "New habit" and the comma opens the settings.
 *
 * `canCreate` is false until the habits have come, so "New habit" never opens on a list that
 * is not there yet.
 */
export function Dock({ current, canCreate = true }: { current: DockTab; canCreate?: boolean }) {
  const openSheet = useOpenSheet();
  const reduceMotion = useReducedMotion() === true;
  useDockKeys(current, canCreate);

  return (
    <>
      <div className="dock-room" aria-hidden />
      <div className="dock">
        <nav className="dock-pill dock-tabs" aria-label="Screens">
          {TABS.map(({ tab, to, label, Icon }) => (
            <Link
              key={tab}
              to={to}
              replace
              onClick={() => noteTabChange(current, tab)}
              className="dock-tab"
              data-tab={tab}
              aria-current={tab === current ? "page" : undefined}
              aria-keyshortcuts={tab === "settings" ? "," : undefined}
            >
              {tab === current ? (
                // The dock of the new screen takes the pill over from the old one, which has gone.
                <motion.span
                  layoutId={reduceMotion ? undefined : "dock-tab-pill"}
                  transition={springs.lift}
                  className="dock-tab-pill"
                  aria-hidden
                />
              ) : null}
              <span className="dock-tab-content">
                <Icon weight={tab === current ? "fill" : "bold"} aria-hidden />
                <span className="dock-tab-label">{label}</span>
              </span>
            </Link>
          ))}
        </nav>
        {canCreate ? (
          <button
            type="button"
            className="dock-create"
            aria-label="New habit"
            aria-keyshortcuts="N"
            onClick={() => openSheet({ new: true })}
          >
            <PlusIcon weight="bold" aria-hidden />
          </button>
        ) : null}
      </div>
    </>
  );
}

type TabDirection = "forward" | "back";

/** The last change of tab: its direction (`forward` to a tab at the right) and its time. */
let lastTabChange: { direction: TabDirection; at: number } | null = null;

/** How long after a tap on a tab its screen counts as entering. */
const TAB_ENTER_WINDOW_MS = 600;

function noteTabChange(from: DockTab, to: DockTab): void {
  if (from === to) return;
  const order = (tab: DockTab) => TABS.findIndex((entry) => entry.tab === tab);
  lastTabChange = {
    direction: order(to) > order(from) ? "forward" : "back",
    at: performance.now(),
  };
}

/**
 * For the root of a screen with a dock: the side its content comes in from when a tab has just
 * opened it, as `data-tab-enter`, or undefined when it opened otherwise (a load, the way back from
 * a habit's page). Read once, when the screen mounts, so a later render never plays it again.
 */
export function useTabEnter(): TabDirection | undefined {
  const [direction] = useState(() =>
    lastTabChange !== null && performance.now() - lastTabChange.at < TAB_ENTER_WINDOW_MS
      ? lastTabChange.direction
      : undefined,
  );
  return direction;
}

/**
 * N opens "New habit", and the comma opens the settings. Not while a sheet is open or a field has
 * the focus, and not with Cmd, Ctrl or Alt (Cmd+N is the browser's).
 */
function useDockKeys(current: DockTab, canCreate: boolean) {
  const openSheet = useOpenSheet();
  const navigate = useNavigate();
  const search = useSheetSearch();
  const sheetOpen = Object.values(search).some((value) => value !== undefined);
  useEffect(() => {
    if (sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key.toLowerCase() === "n" && canCreate) {
        event.preventDefault();
        openSheet({ new: true });
      } else if (event.key === ",") {
        event.preventDefault();
        noteTabChange(current, "settings");
        void navigate({ to: "/settings", replace: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCreate, current, navigate, openSheet, sheetOpen]);
}
