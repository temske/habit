import { createRouter, type RouterHistory } from "@tanstack/react-router";

import { WIDE_QUERY } from "@/components/use-media-query";
import { AppErrorScreen } from "@/features/app-error";
import { routeTree } from "@/routeTree.gen";

/** The app's router; tests pass a memory history. */
export function createAppRouter(history?: RouterHistory) {
  let shownPath: string | undefined;
  return createRouter({
    routeTree,
    ...(history === undefined ? {} : { history }),
    // An error that a screen does not handle: a calm screen with "Reload", not the router's own.
    defaultErrorComponent: AppErrorScreen,
    // A new screen starts at the top, and the back gesture returns to a screen where it was left
    // (the list keeps its scroll). A sheet (`?new`, `?edit`, `?entry`) changes only the search
    // params of the same screen: it leaves the scroll alone, also when it closes. On a desktop the
    // window does not scroll: the list and the page beside it scroll by themselves, and a new page
    // is a new column (features/screens).
    scrollRestoration: ({ location }) => {
      const sameScreen = location.pathname === shownPath;
      shownPath = location.pathname;
      return !sameScreen && !window.matchMedia(WIDE_QUERY).matches;
    },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
