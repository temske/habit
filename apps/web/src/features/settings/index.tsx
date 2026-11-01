import { useAuth } from "@habit/data";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { useState } from "react";

import { Dock } from "@/features/dock";
import { SheetButton } from "@/features/habit-form/controls";

import "@/features/settings/settings.css";

/**
 * The settings (`/settings`), a screen of the app's top level beside the habits: the dock's second
 * tab. For now it holds the account and a word on the theme; archive, import and export come here
 * later, each a section of its own.
 */
export function SettingsPage() {
  const auth = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="settings-screen">
      <main className="settings-page">
        <h1 className="settings-title">Settings</h1>
        <section className="settings-section" aria-labelledby="settings-account">
          <h2 id="settings-account" className="settings-heading">
            Account
          </h2>
          <SheetButton
            variant="quiet"
            className="w-full"
            disabled={signingOut || auth.status !== "ready"}
            onClick={() => {
              if (auth.status !== "ready") return;
              setSigningOut(true);
              auth.signOut();
            }}
          >
            <SignOutIcon weight="bold" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </SheetButton>
        </section>
        <section className="settings-section" aria-labelledby="settings-theme">
          <h2 id="settings-theme" className="settings-heading">
            Theme
          </h2>
          <p className="settings-text">
            The theme follows the light or dark setting of the system.
          </p>
        </section>
      </main>
      <Dock current="settings" />
    </div>
  );
}
