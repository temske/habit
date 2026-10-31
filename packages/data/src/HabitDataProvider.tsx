import { Clerk } from "@clerk/clerk-js";
import { ClerkProvider, HandleSSOCallback, useAuth, useClerk, useSignIn } from "@clerk/react";
import type { Day, Month } from "@habit/core";
import { liveWindow, monthOf, today } from "@habit/core";
import type { RequestForQueries } from "convex/react";
import { ConvexReactClient, useConvexAuth, useMutation, useQueries } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "../convex/_generated/api";
import type { EmailCodeSignIn } from "./api";
import { HabitDataContext } from "./api";
import type { Me } from "./engine";
import { useHabitDataEngine } from "./engine";
import { performOptimistically } from "./optimistic";
import type { SnapshotStore } from "./snapshot";
import { indexedDbSnapshotStore } from "./snapshot";
import type { Data, FlatAction } from "./state";

/**
 * The page that Clerk returns to after the Google sign-in when it needs one more step, such as the
 * sign-up of a new user. The provider shows Clerk's handler there instead of the app.
 */
export const SSO_CALLBACK_PATH = "/sso-callback";

/** The live window covers the 12-month grid plus the current Month (docs/v1.md, "Data"). */
const LIVE_MONTHS = 13;

const clerks = new Map<string, Clerk>();

/**
 * Clerk's script, in the app's bundle instead of from Clerk's CDN. The service worker caches it
 * with the app, so the app starts offline (Clerk then reports the last session in its "degraded"
 * state) and starts faster online (docs/notes/pwa.md). One instance for each key, also when React
 * mounts the provider two times: with two, the session of a sign-in goes to the other one.
 * `@clerk/clerk-js` and `@clerk/react` must resolve one version of `@clerk/shared`.
 */
function clerkInstance(publishableKey: string): Clerk {
  let clerk = clerks.get(publishableKey);
  if (clerk === undefined) {
    clerk = new Clerk(publishableKey);
    clerks.set(publishableKey, clerk);
  }
  return clerk;
}

const clients = new Map<string, ConvexReactClient>();

/** One client for each deployment, also when React mounts the provider two times. */
function convexClient(url: string): ConvexReactClient {
  let client = clients.get(url);
  if (client === undefined) {
    client = new ConvexReactClient(url);
    clients.set(url, client);
  }
  return client;
}

/**
 * The real provider: Clerk sign-in, Convex data, optimistic updates, the IndexedDB snapshot for an
 * instant start (docs/v1.md). It reads `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY`; the
 * props override them.
 */
export function HabitDataProvider(props: {
  children: ReactNode;
  convexUrl?: string;
  clerkPublishableKey?: string;
}): ReactNode {
  const convexUrl = props.convexUrl ?? import.meta.env.VITE_CONVEX_URL;
  const publishableKey = props.clerkPublishableKey ?? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!convexUrl) throw new Error("@habit/data: set VITE_CONVEX_URL (see apps/web/.env.example)");
  if (!publishableKey) {
    throw new Error("@habit/data: set VITE_CLERK_PUBLISHABLE_KEY (see apps/web/.env.example)");
  }
  const [snapshots] = useState(indexedDbSnapshotStore);

  return (
    <ClerkProvider
      Clerk={clerkInstance(publishableKey)}
      publishableKey={publishableKey}
      afterSignOutUrl="/"
    >
      <ConvexProviderWithClerk client={convexClient(convexUrl)} useAuth={useAuth}>
        {globalThis.location?.pathname === SSO_CALLBACK_PATH ? (
          <SsoCallback />
        ) : (
          <ConvexHabitData snapshots={snapshots}>{props.children}</ConvexHabitData>
        )}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function SsoCallback(): ReactNode {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  // Opened with no sign-in in progress, as from a bookmark: the user is signed in already.
  const checked = useRef(false);
  useEffect(() => {
    if (!isLoaded || checked.current) return;
    checked.current = true;
    if (isSignedIn) location.replace("/");
  }, [isLoaded, isSignedIn]);
  return (
    <HandleSSOCallback
      navigateToApp={({ decorateUrl }) => {
        location.replace(decorateUrl("/"));
      }}
      // Another step, such as a missing field: Clerk's own pages finish the sign-in.
      navigateToSignIn={() => {
        void clerk.redirectToSignIn();
      }}
      navigateToSignUp={() => {
        void clerk.redirectToSignUp();
      }}
    />
  );
}

function ConvexHabitData(props: { snapshots: SnapshotStore; children: ReactNode }): ReactNode {
  const clerk = useClerk();
  const { isLoaded, userId } = useAuth();
  const { isAuthenticated } = useConvexAuth();

  const day = useToday();
  const windowRange = useMemo(() => liveWindow(day, LIVE_MONTHS), [day]);
  const [retained, retainMonth] = useRetainedMonths();
  const firstLiveMonth = monthOf(windowRange.from);
  const olderMonths = useMemo(
    () => retained.filter((month) => month < firstLiveMonth),
    [retained, firstLiveMonth],
  );

  // The window whose data came last. When the window moves to a new Day, the old window stays
  // subscribed until the new one loads, so the screen keeps its data; the engine holds taps until
  // then (`liveStale`).
  const [loadedRange, setLoadedRange] = useState<{ from: Day; to: Day } | null>(null);
  const previousRange =
    loadedRange !== null && !sameRange(loadedRange, windowRange) ? loadedRange : null;

  // One subscription for the user, one for the live window, one for each older Month. The owner's
  // data loads at the same time as the answer of `me`, without waiting for it.
  const queries = useMemo(() => {
    const request: RequestForQueries = {};
    if (!isAuthenticated) return request;
    request.me = { query: api.users.me, args: {} };
    request.days = { query: api.data.days, args: windowRange };
    if (previousRange !== null) {
      request.previousDays = { query: api.data.days, args: previousRange };
    }
    for (const month of olderMonths) {
      request[`month:${month}`] = { query: api.data.month, args: { month } };
    }
    return request;
  }, [isAuthenticated, windowRange, previousRange, olderMonths]);
  const results = useQueries(queries);

  const me = resultOf<Me | null>(results.me) ?? undefined;
  const current = resultOf<Data>(results.days);
  if (current !== undefined && loadedRange !== windowRange) setLoadedRange(windowRange);
  const live = current ?? resultOf<Data>(results.previousDays);
  const liveStale = current === undefined && live !== undefined;
  const months = useMemo(() => {
    const loaded = new Map<Month, Data>();
    for (const month of olderMonths) {
      const data = resultOf<Data>(results[`month:${month}`]);
      if (data !== undefined) loaded.set(month, data);
    }
    return loaded;
  }, [results, olderMonths]);

  const mutate = useMutation(api.data.perform);
  const send = useMemo(() => {
    const withUpdate = mutate.withOptimisticUpdate(performOptimistically);
    return (action: FlatAction, now: number) => withUpdate({ action, now });
  }, [mutate]);

  const { signIn: signInResource } = useSignIn();
  const signInRef = useRef(signInResource);
  useEffect(() => {
    signInRef.current = signInResource;
  });
  const signIn = useCallback(() => {
    void signInRef.current
      .sso({
        strategy: "oauth_google",
        redirectUrl: location.href,
        redirectCallbackUrl: new URL(SSO_CALLBACK_PATH, location.origin).href,
      })
      .then(({ error }) => {
        // Clerk's own sign-in page, which offers Google and the email code, as a fallback.
        if (error) void clerk.redirectToSignIn();
      });
  }, [clerk]);
  const emailCode = useMemo<EmailCodeSignIn>(
    () => ({
      sendCode: async (email) => {
        const { error } = await signInRef.current.emailCode.sendCode({ emailAddress: email });
        if (error) throw clerkError(error);
      },
      verifyCode: async (code) => {
        const verified = await signInRef.current.emailCode.verifyCode({ code });
        if (verified.error) throw clerkError(verified.error);
        const finalized = await signInRef.current.finalize();
        if (finalized.error) throw clerkError(finalized.error);
      },
    }),
    [],
  );
  const signOut = useCallback(() => clerk.signOut(), [clerk]);

  const value = useHabitDataEngine({
    clerkLoaded: isLoaded,
    userId: userId ?? null,
    me,
    live,
    liveStale,
    months,
    window: windowRange,
    retainMonth,
    send,
    signIn,
    emailCode,
    signOut,
    snapshots: props.snapshots,
  });

  return <HabitDataContext.Provider value={value}>{props.children}</HabitDataContext.Provider>;
}

/** An Error with the message of a Clerk error, the long form when Clerk gives one. */
function clerkError(error: { message: string; longMessage?: string }): Error {
  return new Error(error.longMessage ?? error.message);
}

/** The value of a query result of `useQueries`: undefined while it loads or after an error. */
function resultOf<T>(result: unknown): T | undefined {
  return result === undefined || result instanceof Error ? undefined : (result as T);
}

/** Today, also after midnight or after the phone wakes up. */
function useToday(): Day {
  const [day, setDay] = useState(() => today());
  useEffect(() => {
    const update = () => setDay(today());
    const timer = setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return day;
}

function sameRange(a: { from: Day; to: Day }, b: { from: Day; to: Day }): boolean {
  return a.from === b.from && a.to === b.to;
}

/** The Months that something shows, with a count of the users of each. */
function useRetainedMonths(): [Month[], (month: Month) => () => void] {
  const [counts, setCounts] = useState<ReadonlyMap<Month, number>>(() => new Map());
  const retain = useCallback((month: Month) => {
    setCounts((current) => withCount(current, month, 1));
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setCounts((current) => withCount(current, month, -1));
    };
  }, []);
  const months = useMemo(() => [...counts.keys()].sort(), [counts]);
  return [months, retain];
}

function withCount(
  counts: ReadonlyMap<Month, number>,
  month: Month,
  change: number,
): ReadonlyMap<Month, number> {
  const next = new Map(counts);
  const count = (next.get(month) ?? 0) + change;
  if (count > 0) next.set(month, count);
  else next.delete(month);
  return next;
}
