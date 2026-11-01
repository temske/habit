import { screen } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { renderApp } from "@/test/render-app";

test("the home page is the habit list", async () => {
  renderApp("/");

  expect(await screen.findByRole("heading", { name: "Habits" })).toBeTruthy();
});

test("an error in a screen shows a calm screen with Reload, not the router's message", async () => {
  // React logs the caught error.
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    renderApp(
      "/habits/019a0000-0000-7000-8000-000000000001",
      {},
      {
        monthStatus: () => {
          throw new Error("boom");
        },
      },
    );

    expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hide Error" })).toBeNull();
  } finally {
    log.mockRestore();
  }
});
