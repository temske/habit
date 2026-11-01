import { addDays, emptyState, today as todayOf, type Day } from "@habit/core";
import { demoHabitIds } from "@habit/data/testing";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { formatDayLong } from "@/components/format";
import { renderApp } from "@/test/render-app";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** The squares of one habit, oldest first (today is the last). */
async function squaresOf(name: string): Promise<HTMLElement[]> {
  const group = await screen.findByRole("group", { name });
  return within(group).getAllByRole("button");
}

function label(day: Day, entry: string): string {
  return `${formatDayLong(day)}: ${entry}`;
}

test("the list shows each habit, the last five Days, and the New habit button", async () => {
  renderApp("/");

  const today = todayOf();
  expect(await squaresOf("Water")).toHaveLength(5);
  expect(screen.getByRole("link", { name: /Meditate/ })).toBeTruthy();
  const water = await squaresOf("Water");
  expect(water[4]!.getAttribute("aria-label")).toBe(label(today, "5 of 8 glasses"));
  expect(screen.getByRole("button", { name: "New habit" })).toBeTruthy();
});

test("a tap on a check square sets the Day, and a second tap clears it", async () => {
  renderApp("/");

  const yesterday = (await squaresOf("Vitamins"))[4]!;
  expect(yesterday.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(yesterday);
  expect(yesterday.getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(yesterday);
  expect(yesterday.getAttribute("aria-pressed")).toBe("false");
});

test("a tap on a number square adds the Step", async () => {
  renderApp("/");

  const today = todayOf();
  const square = (await squaresOf("Water"))[4]!;
  fireEvent.click(square);
  expect(square.getAttribute("aria-label")).toBe(label(today, "6 of 8 glasses"));
});

test("a tap on a choice square opens the input, and a pick sets the Day", async () => {
  const { router } = renderApp("/");

  const today = todayOf();
  fireEvent.click((await squaresOf("Gym"))[3]!);
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({
      entry: `${demoHabitIds.gym}:${addDays(today, -1)}`,
    }),
  );
  fireEvent.click(await screen.findByRole("radio", { name: /Push/ }));
  const square = (await squaresOf("Gym"))[3]!;
  expect(square.getAttribute("aria-label")).toBe(label(addDays(today, -1), "Push"));
});

test("a drag across the squares of a check habit paints them, and Undo takes it back", async () => {
  renderApp("/");

  const squares = await squaresOf("Vitamins");
  // jsdom lays nothing out: give each square a column 36px wide.
  squares.forEach((square, index) => {
    vi.spyOn(square, "getBoundingClientRect").mockReturnValue(new DOMRect(index * 36, 0, 36, 54));
  });
  const row = squares[0]!.parentElement!;
  fireEvent.pointerDown(squares[1]!, { pointerId: 1, clientX: 50, clientY: 20 });
  fireEvent.pointerMove(row, { pointerId: 1, clientX: 90, clientY: 20 });
  fireEvent.pointerMove(row, { pointerId: 1, clientX: 170, clientY: 20 });
  fireEvent.pointerUp(row, { pointerId: 1, clientX: 170, clientY: 20 });

  // Vitamins had Entries on the 3rd and 4th Days: the paint sets the 2nd and the 5th.
  expect(squares.map((square) => square.getAttribute("aria-pressed"))).toEqual([
    "true",
    "true",
    "true",
    "true",
    "true",
  ]);
  expect(await screen.findByText("Painted 2 days")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(squares.map((square) => square.getAttribute("aria-pressed"))).toEqual([
    "true",
    "false",
    "true",
    "true",
    "false",
  ]);
});

test("a failed write rolls back and offers Retry", async () => {
  renderApp("/", { failWrites: true });

  const square = (await squaresOf("Vitamins"))[4]!;
  fireEvent.click(square);
  expect(square.getAttribute("aria-pressed")).toBe("true");
  expect(await screen.findByText("Couldn't save")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  expect(square.getAttribute("aria-pressed")).toBe("false");
});

test("the New habit button opens the create sheet", async () => {
  const { router } = renderApp("/");

  fireEvent.click(await screen.findByRole("button", { name: "New habit" }));
  await waitFor(() => expect(router.state.location.search).toMatchObject({ new: true }));
});

test("N opens the create sheet, but not with Cmd, and the comma opens the settings", async () => {
  const { router } = renderApp("/");
  await screen.findByRole("button", { name: "New habit" });

  fireEvent.keyDown(window, { key: "n", metaKey: true });
  expect(router.state.location.search).toEqual({});
  fireEvent.keyDown(window, { key: "n" });
  await waitFor(() => expect(router.state.location.search).toMatchObject({ new: true }));

  router.history.back();
  await waitFor(() => expect(router.state.location.search).toEqual({}));
  fireEvent.keyDown(window, { key: "," });
  await waitFor(() => expect(router.state.location.pathname).toBe("/settings"));
});

test("with no habits yet, the create sheet opens by itself", async () => {
  const { router } = renderApp("/", { initial: emptyState() });

  await waitFor(() => expect(router.state.location.search).toMatchObject({ new: true }));
});

test("until the data comes, the loading screen stays in place of the list", async () => {
  // The owner is signed in, and neither the snapshot nor the live data is there yet.
  renderApp("/", {}, { source: "none", state: emptyState() });

  expect((await screen.findByRole("status")).textContent).toBe("Loading");
  expect(screen.queryByRole("heading", { name: "Habits" })).toBeNull();
  expect(screen.queryByRole("button", { name: "New habit" })).toBeNull();
});

test("after a slow start, the list shows complete: every row with its icon", async () => {
  renderApp("/", { startMs: 200 });

  expect((await screen.findByRole("status")).textContent).toBe("Loading");
  await screen.findByRole("heading", { name: "Habits" });
  for (const link of screen.getAllByRole("link", { name: /.+/ })) {
    expect(link.querySelector("svg")).not.toBeNull();
  }
});

test("the columns move to the new Day at midnight", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 9, 22, 23, 59, 58));
  renderApp("/", { today: "2026-10-22" as Day });

  expect((await squaresOf("Water"))[4]!.getAttribute("aria-label")).toMatch(
    /^Thursday, October 22/,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect((await squaresOf("Water"))[4]!.getAttribute("aria-label")).toMatch(/^Friday, October 23/);
});
