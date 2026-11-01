import {
  applyAction,
  emptyState,
  invertAction,
  liveWindow,
  today as todayOf,
  type Action,
  type Day,
  type HabitState,
} from "@habit/core";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  HabitDataContext,
  type AuthState,
  type EmailCodeSignIn,
  type HabitDataApi,
  type PerformResult,
} from "../api";
import { demoState } from "./demoState";

/** The user ids of the fake sign-in. */
export const FAKE_OWNER_ID = "user_fake_owner";
export const FAKE_STRANGER_ID = "user_fake_stranger";

/** The code that the fake email-code sign-in accepts, the same as Clerk's for its test users. */
export const FAKE_EMAIL_CODE = "424242";

/**
 * An in-memory provider for tests and for UI work without a backend (`VITE_HABIT_DATA=fake`).
 * It implements `HabitDataApi` with `applyAction` and `invertAction` from @habit/core.
 *
 * Until the person is signed in as the owner, there is no data (`source: "none"`), as with the
 * real provider. `signIn` and `signOut` of the `auth` state work.
 */
export function FakeHabitDataProvider(props: {
  /** The starting data, read once. Default: `demoState(today)`. */
  initial?: HabitState;
  /** Default: ready, as the owner. A change of this prop changes the state of the sign-in. */
  auth?: AuthState["status"];
  /** A delay before `done` resolves, to see pending states. Default 0. */
  latencyMs?: number;
  /** When true, every write fails after the delay, to see the error state. */
  failWrites?: boolean;
  /**
   * A cold start of the real provider without a snapshot, to see the loading states: the sign-in
   * loads for half of this time, then the owner is signed in with no data yet (`source: "none"`)
   * for the other half, then the live data comes. Default 0: ready at once.
   */
  startMs?: number;
  /** The Day of the live window and of the demo data. Default: today in the local time zone. */
  today?: Day;
  children: ReactNode;
}): ReactNode {
  const { auth = "ready", latencyMs = 0, failWrites = false, startMs = 0, children } = props;
  const [day] = useState(() => props.today ?? todayOf());
  const [store] = useState(() => new FakeStore(props.initial ?? demoState(day)));
  const state = useSyncExternalStore(store.subscribe, store.getState);

  // The state of the sign-in starts from the prop, follows its changes, and changes on signIn and
  // signOut.
  const [status, setStatus] = useState(auth);
  const [statusProp, setStatusProp] = useState(auth);
  if (auth !== statusProp) {
    setStatusProp(auth);
    setStatus(auth);
  }
  const start = useColdStart(startMs);
  const shownStatus = status === "ready" && start === "auth" ? "loading" : status;
  const authState = useMemo(() => authStateOf(shownStatus, setStatus), [shownStatus]);

  const perform = useCallback(
    (action: Action) => store.perform(action, { latencyMs, failWrites }),
    [store, latencyMs, failWrites],
  );

  const api = useMemo<HabitDataApi>(() => {
    const ready = shownStatus === "ready" && start === "done";
    return {
      auth: authState,
      source: ready ? "live" : "none",
      state: ready ? state : EMPTY_STATE,
      window: liveWindow(day, 13),
      retainMonth: retainNothing,
      monthStatus: alwaysReady,
      perform,
    };
  }, [authState, shownStatus, start, state, day, perform]);

  return <HabitDataContext.Provider value={api}>{children}</HabitDataContext.Provider>;
}

const EMPTY_STATE = emptyState();

/** The phase of a cold start of `startMs`: the sign-in loads, then the data, then it is done. */
function useColdStart(startMs: number): "auth" | "data" | "done" {
  const [phase, setPhase] = useState<"auth" | "data" | "done">(startMs > 0 ? "auth" : "done");
  useEffect(() => {
    if (startMs <= 0) return;
    const data = setTimeout(() => setPhase("data"), startMs / 2);
    const done = setTimeout(() => setPhase("done"), startMs);
    return () => {
      clearTimeout(data);
      clearTimeout(done);
    };
  }, [startMs]);
  return phase;
}

/** All data is in memory, so each Month is loaded already. */
function retainNothing(): () => void {
  return () => {};
}

function alwaysReady(): "ready" {
  return "ready";
}

function authStateOf(
  status: AuthState["status"],
  setStatus: (status: AuthState["status"]) => void,
): AuthState {
  const signOut = () => setStatus("signedOut");
  switch (status) {
    case "loading":
      return { status };
    case "signedOut":
      return { status, signIn: () => setStatus("ready"), emailCode: fakeEmailCode(setStatus) };
    case "noAccess":
      return { status, userId: FAKE_STRANGER_ID, signOut };
    case "ready":
      return { status, userId: FAKE_OWNER_ID, signOut };
  }
}

/**
 * The email-code sign-in of the fake: any address gets a code; `FAKE_EMAIL_CODE` signs in, as the
 * owner, or as a stranger for an address that contains "guest" (like the guest test user).
 */
function fakeEmailCode(setStatus: (status: AuthState["status"]) => void): EmailCodeSignIn {
  let email: string | null = null;
  return {
    sendCode: async (address) => {
      if (!address.includes("@")) throw new Error("Enter an email address.");
      email = address;
    },
    verifyCode: async (code) => {
      if (email === null) throw new Error("Send a code first.");
      if (code.trim() !== FAKE_EMAIL_CODE) throw new Error("Incorrect code.");
      setStatus(email.includes("guest") ? "noAccess" : "ready");
    },
  };
}

interface Write {
  action: Action;
  now: number;
}

/**
 * The data of the fake: the confirmed state and the writes that wait for their confirmation. The
 * screen shows the pending writes applied over the confirmed state, as an optimistic update does,
 * so a failed write goes away without undoing the writes after it.
 */
class FakeStore {
  private confirmed: HabitState;
  private pending: Write[] = [];
  private visible: HabitState;
  private listeners = new Set<() => void>();

  constructor(initial: HabitState) {
    this.confirmed = initial;
    this.visible = initial;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): HabitState => this.visible;

  perform(action: Action, options: { latencyMs: number; failWrites: boolean }): PerformResult {
    const inverse = invertAction(this.visible, action);
    const write: Write = { action, now: Date.now() };
    this.pending.push(write);
    this.update();

    const done = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        this.pending = this.pending.filter((pending) => pending !== write);
        if (options.failWrites) {
          this.update();
          reject(new Error("@habit/data/testing: the write failed (failWrites)"));
        } else {
          this.confirmed = applyAction(this.confirmed, action, write.now);
          this.update();
          resolve();
        }
      }, options.latencyMs);
    });
    // A caller that does not wait for `done` gets no unhandled rejection; one that waits still
    // gets the error.
    done.catch(() => {});
    return { inverse, done };
  }

  private update(): void {
    this.visible = this.pending.reduce(
      (state, write) => applyAction(state, write.action, write.now),
      this.confirmed,
    );
    for (const listener of this.listeners) listener();
  }
}
