import { createRootRoute, Outlet } from "@tanstack/react-router";

import { validateSheetSearch } from "@/components/sheet-search";
import { AppToaster } from "@/components/toast";
import { AuthGate } from "@/features/auth/auth-gate";
import { EntryInputSheet } from "@/features/entry-input";
import { HabitFormSheet } from "@/features/habit-form";
import { SettingsSheet } from "@/features/settings";

export const Route = createRootRoute({
  // The sheets are search params on any route (`?new`, `?edit`, `?entry`, `?monthPicker`,
  // `?settings`), so they open over the list and over the habit page, and the back gesture closes
  // them.
  validateSearch: validateSheetSearch,
  component: Root,
});

function Root() {
  return (
    <>
      {/* Only the owner gets the screens; the other states of the sign-in get their own. */}
      <AuthGate>
        <Outlet />
        <HabitFormSheet />
        <EntryInputSheet />
        <SettingsSheet />
      </AuthGate>
      {/* Each screen has its dock at the bottom: the toasts show above it. */}
      <AppToaster lift="3.75rem" />
    </>
  );
}
