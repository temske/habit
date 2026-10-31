interface ImportMetaEnv {
  /** "fake": the in-memory provider with the demo data. Anything else: the real backend. */
  readonly VITE_HABIT_DATA?: string;
  /** Fake mode only: the delay before a write is confirmed, to see pending states. */
  readonly VITE_HABIT_FAKE_LATENCY_MS?: string;
  /** Fake mode only: "true" makes every write fail, to see the "Couldn't save" toast. */
  readonly VITE_HABIT_FAKE_FAIL?: string;
  /** The Clerk instance. A development key (`pk_test_`) also turns on the email code. */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
}
