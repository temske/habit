import type { EmailCodeSignIn } from "@habit/data";
import { GoogleLogoIcon } from "@phosphor-icons/react/dist/csr/GoogleLogo";
import { useEffect, useId, useState, type FormEvent } from "react";

import { MorphHeight } from "@/components/sheet";
import { useMediaQuery } from "@/components/use-media-query";
import { AuthButton, AuthScreen } from "@/features/auth/auth-screen";

/** The test users of the Clerk development instance (docs/notes/data.md). */
const TEST_USERS = {
  owner: "habit-owner+clerk_test@example.com",
  guest: "habit-guest+clerk_test@example.com",
} as const;

/**
 * The email code with the note about the test users is for the Clerk development instance, whose
 * test users take the code 424242: in the dev server, and in a build on that instance, such as the
 * deployment at habit.tem.sh (docs/deploy.md).
 */
function onDevInstance(): boolean {
  return (
    import.meta.env.DEV ||
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") === true
  );
}

/**
 * Signed out: the mark, the name, and one action, "Continue with Google". A sign-in with an email
 * code is one tap further on the development instance, so the test users can sign in.
 *
 * The installed app offers the email code alone, on any instance. Google's page is on another
 * origin, and a Home Screen app on iOS opens a page outside its scope in a browser view with bars;
 * the bars stay when the sign-in comes back to the app. The session also lands in a Safari sheet
 * whose cookies the app does not share. The email code runs inside the app (docs/notes/pwa.md).
 */
export function SignInScreen({
  signIn,
  emailCode,
}: {
  signIn: () => void;
  emailCode?: EmailCodeSignIn | undefined;
}) {
  const [opening, setOpening] = useState(false);
  const installed = useInstalled();
  const devInstance = onDevInstance();

  // Back from Google's page, the browser can restore this page as it was left: the button must
  // work again.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setOpening(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return (
    <AuthScreen filled title="Habit">
      <div className="flex w-full flex-col items-stretch gap-3">
        {installed ? null : (
          <AuthButton
            aria-busy={opening}
            disabled={opening}
            onClick={() => {
              setOpening(true);
              signIn();
            }}
          >
            <GoogleLogoIcon weight="bold" className="size-4.5" aria-hidden />
            {opening ? "Opening Google…" : "Continue with Google"}
          </AuthButton>
        )}
        {(devInstance || installed) && emailCode !== undefined ? (
          <EmailCodeSection emailCode={emailCode} testUsers={devInstance} primary={installed} />
        ) : null}
      </div>
    </AuthScreen>
  );
}

/** The app runs installed, from the Home Screen, without the browser's bars. */
function useInstalled(): boolean {
  const standalone = useMediaQuery("(display-mode: standalone)");
  // iOS before 16.4 reports a Home Screen app only through `navigator.standalone`.
  return standalone || (navigator as { standalone?: boolean }).standalone === true;
}

type Step = { name: "closed" } | { name: "email" } | { name: "code"; email: string };

/**
 * A sign-in with a code from an email, in two short steps. `testUsers`: a note that names the test
 * users of the development instance. `primary`: the only way to sign in, so it opens from the
 * primary button, not from a quiet link under Google.
 */
function EmailCodeSection({
  emailCode,
  testUsers,
  primary,
}: {
  emailCode: EmailCodeSignIn;
  testUsers: boolean;
  primary: boolean;
}) {
  const [step, setStep] = useState<Step>({ name: "closed" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = useId();

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    void run(async () => {
      await emailCode.sendCode(address);
      setCode("");
      setStep({ name: "code", email: address });
    });
  };

  const verifyCode = (event: FormEvent) => {
    event.preventDefault();
    // A success unmounts this screen: the app shows the list, or "no access".
    void run(() => emailCode.verifyCode(code.trim()));
  };

  const errorId = `${ids}-error`;
  const errorLine =
    error === null ? null : (
      <p id={errorId} role="alert" className="auth-message">
        {error}
      </p>
    );

  return (
    <MorphHeight className="-mx-1 px-1">
      {step.name === "closed" ? (
        primary ? (
          <AuthButton className="w-full" onClick={() => setStep({ name: "email" })}>
            Sign in with an email code
          </AuthButton>
        ) : (
          <button
            type="button"
            className="auth-quiet-link mx-auto mt-1"
            onClick={() => setStep({ name: "email" })}
          >
            Sign in with an email code
          </button>
        )
      ) : step.name === "email" ? (
        <form className="flex flex-col gap-3 pt-5" onSubmit={sendCode} noValidate>
          <label htmlFor={`${ids}-email`} className="sr-only">
            Email
          </label>
          <input
            id={`${ids}-email`}
            className="auth-field"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error === null ? (testUsers ? `${ids}-note` : undefined) : errorId}
            // The person opened this form a moment ago.
            autoFocus
          />
          {errorLine}
          <AuthButton variant="quiet" type="submit" disabled={busy || email.trim() === ""}>
            {busy ? "Sending…" : "Send code"}
          </AuthButton>
          {testUsers ? (
            <p id={`${ids}-note`} className="auth-note">
              Development only. The test users{" "}
              <TestUser label="owner" onPick={() => setEmail(TEST_USERS.owner)} /> and{" "}
              <TestUser label="guest" onPick={() => setEmail(TEST_USERS.guest)} /> get the code
              424242.
            </p>
          ) : null}
        </form>
      ) : (
        <form className="flex flex-col gap-3 pt-5" onSubmit={verifyCode} noValidate>
          <p className="auth-note">
            Enter the code sent to
            <span className="block text-ink-2 [overflow-wrap:anywhere]">{step.email}</span>
          </p>
          <label htmlFor={`${ids}-code`} className="sr-only">
            Code
          </label>
          <input
            id={`${ids}-code`}
            className="auth-field text-center tracking-[0.2em] tabular-nums"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : errorId}
            autoFocus
          />
          {errorLine}
          <AuthButton variant="quiet" type="submit" disabled={busy || code.length < 6}>
            {busy ? "Signing in…" : "Sign in"}
          </AuthButton>
          <button
            type="button"
            className="auth-quiet-link mx-auto"
            onClick={() => {
              setError(null);
              setStep({ name: "email" });
            }}
          >
            Use another email
          </button>
        </form>
      )}
    </MorphHeight>
  );
}

/** A test user in the note: a tap puts its address in the field. */
function TestUser({ label, onPick }: { label: string; onPick: () => void }) {
  return (
    <button
      type="button"
      className="auth-inline-link"
      aria-label={`Use the ${label} test user`}
      onClick={onPick}
    >
      {label}
    </button>
  );
}
