import { useAuth } from "@habit/data";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { useState } from "react";

import { ResponsiveSheet } from "@/components/sheet";
import { useCloseSheet, useSheetSearch } from "@/components/sheet-search";
import { SheetButton } from "@/features/habit-form/controls";

/**
 * The settings (`?settings=true`): a bottom sheet on a phone, a dialog on a desktop. The gear at
 * the top of the list opens it. For now it holds the account; archive, import and export come
 * here later.
 */
export function SettingsSheet() {
  const { settings } = useSheetSearch();
  const closeSheet = useCloseSheet();
  const auth = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <ResponsiveSheet
      open={settings === true}
      onOpenChange={(open) => {
        if (!open) closeSheet();
      }}
      title="Settings"
      description="The theme follows the system setting."
    >
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
    </ResponsiveSheet>
  );
}
