import type { Habit } from "@habit/core";
import { useAuth, useHabits } from "@habit/data";
import { useMatch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { loadHabitIcons } from "@/components/habit-icon";
import { AuthScreen } from "@/features/auth/auth-screen";
import { NoAccessScreen } from "@/features/auth/no-access";
import { SignInScreen } from "@/features/auth/sign-in";

/**
 * The longest wait for the icons of the first screen after the habits are there. A slow network
 * still gets its list; an icon that comes later fades in by itself.
 */
export const START_ICONS_TIMEOUT_MS = 2000;

/** The fade of the loading frame over the app (`.auth-loading[data-leaving]` in auth.css). */
const LEAVE_MS = 400;

/**
 * Shows the app to the owner only. The other states of the sign-in get their own screen: a quiet
 * loading frame, the sign-in, or "no access".
 *
 * For the owner, the loading frame stays until the habits are there (from the snapshot or the live
 * data) and the icons of the first screen have loaded. Then the app shows complete, and the frame
 * fades out over it. So the list never builds up in steps: the day header alone, the rows without
 * icons, then the icons.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [start, onLeft] = useStart(auth.status === "ready");
  switch (auth.status) {
    case "signedOut":
      return <SignInScreen signIn={auth.signIn} emailCode={auth.emailCode} />;
    case "noAccess":
      return <NoAccessScreen userId={auth.userId} signOut={auth.signOut} />;
    case "loading":
    case "ready":
      return (
        <>
          {start === "waiting" ? null : children}
          {/* The same element from the first frame to the fade, so the mark never starts over. */}
          {start === "shown" ? null : (
            <AuthLoading leaving={start === "revealing"} onLeft={onLeft} />
          )}
        </>
      );
  }
}

type StartPhase = "waiting" | "revealing" | "shown";

/**
 * The phase of the start: waiting for the first data and the icons of the first screen, then
 * revealing (the app is there, and the loading frame fades out over it), then shown. A sign-out
 * starts it again.
 */
function useStart(ready: boolean): [StartPhase, () => void] {
  const { source, habits } = useHabits();
  const openHabitId = useMatch({
    from: "/_screens/habits/$habitId",
    shouldThrow: false,
    select: (match) => match.params.habitId,
  });
  const [phase, setPhase] = useState<StartPhase>("waiting");
  const hasData = ready && source !== "none";
  if (!ready && phase !== "waiting") setPhase("waiting");

  // The habits of the first data decide the icons to wait for; later changes do not.
  const first = useRef({ habits, openHabitId });
  first.current = { habits, openHabitId };

  useEffect(() => {
    if (!hasData) return;
    let active = true;
    const icons = firstScreenHabits(first.current.habits, first.current.openHabitId).map(
      (habit) => habit.icon,
    );
    void loadHabitIcons(icons, START_ICONS_TIMEOUT_MS).then(() => {
      if (active) setPhase((current) => (current === "waiting" ? "revealing" : current));
    });
    return () => {
      active = false;
    };
  }, [hasData]);

  const onLeft = useCallback(
    () => setPhase((current) => (current === "revealing" ? "shown" : current)),
    [],
  );
  return [phase, onLeft];
}

/**
 * The habits whose icons show on the first screen: the rows that fit the window, and the habit
 * whose page is open.
 */
function firstScreenHabits(habits: readonly Habit[], openHabitId: string | undefined): Habit[] {
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  // A row is 3.375rem tall (DESIGN.md); one more for a row cut at the bottom.
  const rows = Math.ceil(window.innerHeight / (3.375 * rem)) + 1;
  const open = habits.find((habit) => habit.id === openHabitId);
  const shown = habits.slice(0, rows);
  return open === undefined || shown.includes(open) ? shown : [...shown, open];
}

/**
 * While the sign-in state or the first data loads: the bare ground, so a fast start goes straight
 * to its screen without a flash. A slow start fades in the empty mark after a second, where the
 * sign-in screen will draw it. When the app is ready under it, the frame fades out (`leaving`).
 */
function AuthLoading({ leaving, onLeft }: { leaving: boolean; onLeft: () => void }) {
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(onLeft, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving, onLeft]);
  return (
    <div
      className="auth-loading"
      data-leaving={leaving ? "" : undefined}
      aria-busy={leaving ? undefined : true}
      aria-hidden={leaving ? true : undefined}
    >
      {leaving ? null : (
        <span className="sr-only" role="status">
          Loading
        </span>
      )}
      <AuthScreen filled={false} />
    </div>
  );
}
