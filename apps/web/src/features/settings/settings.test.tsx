import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vite-plus/test";

import { renderApp } from "@/test/render-app";

test("the gear opens the settings, and Sign out signs the owner out", async () => {
  const { router } = renderApp("/");

  fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
  await waitFor(() => expect(router.state.location.search).toMatchObject({ settings: true }));

  fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  expect(await screen.findByRole("button", { name: "Sign in with an email code" })).toBeTruthy();
});
