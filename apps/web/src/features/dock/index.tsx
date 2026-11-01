import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { RowsIcon } from "@phosphor-icons/react/dist/csr/Rows";
import { Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { useEffect } from "react";

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
 * of `ink`. It is the last thing in its screen and sticks to the bottom of the screen (of the
 * list's column, on a desktop), so the content scrolls under it and fades out above it.
 *
 * A tab changes the screen in place, as the tabs of a native app do: no transition, and no entry
 * in the history, so the back gesture never walks through the tabs. On a keyboard, N opens "New
 * habit" and the comma opens the settings.
 *
 * `canCreate` is false until the habits have come, so "New habit" never opens on a list that
 * is not there yet.
 */
export function Dock({ current, canCreate = true }: { current: DockTab; canCreate?: boolean }) {
  const openSheet = useOpenSheet();
  useDockKeys(canCreate);

  return (
    <div className="dock">
      <nav className="dock-pill dock-tabs" aria-label="Screens">
        {TABS.map(({ tab, to, label, Icon }) => (
          <Link
            key={tab}
            to={to}
            replace
            className="dock-tab"
            aria-current={tab === current ? "page" : undefined}
            aria-keyshortcuts={tab === "settings" ? "," : undefined}
          >
            <Icon weight={tab === current ? "fill" : "bold"} aria-hidden />
            <span className="dock-tab-label">{label}</span>
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
  );
}

/**
 * N opens "New habit", and the comma opens the settings. Not while a sheet is open or a field has
 * the focus, and not with Cmd, Ctrl or Alt (Cmd+N is the browser's).
 */
function useDockKeys(canCreate: boolean) {
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
        void navigate({ to: "/settings", replace: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCreate, navigate, openSheet, sheetOpen]);
}
