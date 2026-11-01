import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vite-plus/test";

import { renderApp } from "@/test/render-app";

test("the Settings tab opens the settings in place of the list, and Habits goes back", async () => {
  const { router } = renderApp("/");

  fireEvent.click(await screen.findByRole("link", { name: "Settings" }));
  expect(await screen.findByRole("heading", { name: "Settings" })).toBeTruthy();
  expect(router.state.location.pathname).toBe("/settings");
  // A tab replaces the screen: the back gesture does not walk through the tabs.
  expect(router.history.length).toBe(1);

  fireEvent.click(screen.getByRole("link", { name: "Habits" }));
  expect(await screen.findByRole("group", { name: "Water" })).toBeTruthy();
});

test("Sign out in the settings signs the owner out", async () => {
  renderApp("/settings");

  fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Sign in with an email code" })).toBeTruthy(),
  );
});
