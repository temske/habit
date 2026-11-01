import { useState } from "react";

import { AuthButton, AuthScreen } from "@/features/auth/auth-screen";

/**
 * The screen of an error that nothing else caught, in place of the router's raw message: the
 * empty Days, a calm line, and "Reload". A reload loads the app again from the start, the newest
 * version too, and it stays in the installed app (the page is in the manifest's scope). The
 * error's own message stays under the button, small, so the owner can report it.
 */
export function AppErrorScreen({ error }: { error: unknown }) {
  const [reloading, setReloading] = useState(false);
  const detail = errorMessage(error);
  return (
    <AuthScreen filled={false} title="Something went wrong">
      <div className="flex flex-col items-stretch gap-6">
        <p className="text-base leading-6 text-pretty text-ink-2">
          The app stopped. Reload it to go on.
        </p>
        <AuthButton
          aria-busy={reloading}
          disabled={reloading}
          onClick={() => {
            setReloading(true);
            window.location.reload();
          }}
        >
          {reloading ? "Reloading…" : "Reload"}
        </AuthButton>
        {detail === "" ? null : <p className="auth-note break-words">{detail}</p>}
      </div>
    </AuthScreen>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}
