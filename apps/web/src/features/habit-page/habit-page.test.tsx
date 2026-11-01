import { emptyState, type Day, type HabitId, type HabitState } from "@habit/core";
import { HabitDataContext, type AuthState, type HabitDataApi } from "@habit/data";
import { demoHabitIds, demoState, FakeHabitDataProvider } from "@habit/data/testing";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { use, type ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { resetAll, setValue } from "@/components/lab/store";
import { createAppRouter } from "@/router";

const TODAY = "2026-10-22" as Day;

// The gestures wait for real holds and springs.
vi.setConfig({ testTimeout: 15_000 });

beforeEach(() => {
  // The page reads today from the clock: a fixed Thursday, 22 October 2026, that still moves, so
  // the events of a gesture have their own times.
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 9, 22, 12));
  // jsdom lays nothing out: the Day under a finger at (x, y) is the date x / 10 of the shown Month.
  document.elementFromPoint = (x: number) =>
    document.querySelector(`[data-slot="0"] [data-day$="-${String(x / 10).padStart(2, "0")}"]`);
});

afterEach(() => {
  vi.useRealTimers();
  act(resetAll);
  localStorage.clear();
});

function renderPage(
  habitId: string,
  wrap: (children: ReactNode) => ReactNode = (c) => c,
  {
    initial = demoState(TODAY),
    auth = "ready",
  }: { initial?: HabitState; auth?: AuthState["status"] } = {},
) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [`/habits/${habitId}`] }));
  render(
    <FakeHabitDataProvider today={TODAY} initial={initial} auth={auth}>
      {wrap(<RouterProvider router={router} />)}
    </FakeHabitDataProvider>,
  );
  return router;
}

/**
 * The button of a Day of the shown Month, by its date: "October 22". The pages beside the shown
 * one are hidden, so this waits until a slide to the Month has ended.
 */
function day(date: string) {
  return screen.findByRole("button", { name: new RegExp(`, ${date}:`) });
}

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

/** A finger on a Day: it lands, waits `holdMs`, moves through `path` (x values), and lifts. */
async function touch(target: Element, { holdMs = 0, path = [] as number[] } = {}) {
  const start = Number((target as HTMLElement).dataset.day!.slice(8)) * 10;
  const pointer = { pointerId: 1, pointerType: "touch", isPrimary: true, button: 0 };
  fireEvent.pointerDown(target, { ...pointer, clientX: start, clientY: 0 });
  if (holdMs > 0) await wait(holdMs);
  for (const x of path) {
    fireEvent.pointerMove(target, { ...pointer, clientX: x, clientY: 0 });
    await wait(16);
  }
  fireEvent.pointerUp(target, { ...pointer, clientX: path.at(-1) ?? start, clientY: 0 });
}

test("shows the habit, the grid of 12 months and the calendar of this month", async () => {
  renderPage(demoHabitIds.water);

  expect(await screen.findByRole("heading", { level: 1, name: "Water" })).toBeTruthy();
  expect(screen.getByText("Eight glasses a day")).toBeTruthy();
  expect(screen.getByRole("region", { name: "The last 12 months" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "October 2026" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to habits" }).getAttribute("href")).toBe("/");
});

test("a check Day toggles with a tap", async () => {
  renderPage(demoHabitIds.meditate);

  const today = await day("October 22");
  expect(today.getAttribute("aria-pressed")).toBe("true");
  await touch(today);
  expect((await day("October 22")).getAttribute("aria-pressed")).toBe("false");
  await touch(await day("October 22"));
  expect((await day("October 22")).getAttribute("aria-pressed")).toBe("true");
});

test("a hold and a drag paint check Days, with one Undo toast", async () => {
  renderPage(demoHabitIds.meditate);

  // Meditate has Entries on the 21st and the 22nd, and none on the 20th. The paint starts on a
  // filled Day, so it clears: the 22nd too, and the empty 20th stays empty.
  await touch(await day("October 21"), { holdMs: 260, path: [220, 200] });

  for (const date of ["October 20", "October 21", "October 22"]) {
    expect((await day(date)).getAttribute("aria-pressed")).toBe("false");
  }
  expect(await screen.findByText("Cleared 2 days")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect((await day("October 21")).getAttribute("aria-pressed")).toBe("true");
  expect((await day("October 22")).getAttribute("aria-pressed")).toBe("true");
  expect((await day("October 20")).getAttribute("aria-pressed")).toBe("false");
});

test("a fast swipe on check Days moves to the previous Month and paints nothing", async () => {
  renderPage(demoHabitIds.meditate);

  const target = await day("October 13");
  const before = target.getAttribute("aria-pressed");
  await touch(target, { path: [150, 260, 400, 560] });

  expect(await screen.findByRole("heading", { name: "September 2026" })).toBeTruthy();
  expect(screen.queryByText(/^Painted/)).toBeNull();
  // Back while the slide may still run: the page must end on October, not on the slide's Month.
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(await screen.findByRole("heading", { name: "October 2026" })).toBeTruthy();
  expect((await day("October 13")).getAttribute("aria-pressed")).toBe(before);
});

test("there are no future Months, and future Days are locked", async () => {
  renderPage(demoHabitIds.meditate);

  const target = await day("October 20");
  expect((screen.getByRole("button", { name: "Next month" }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  // A swipe to the left at the current Month springs back.
  await touch(target, { path: [150, 100, 40, 10] });
  await wait(600);
  expect(screen.getByRole("heading", { name: "October 2026" })).toBeTruthy();

  const tomorrow = await day("October 23");
  expect((tomorrow as HTMLButtonElement).disabled).toBe(true);
  await touch(tomorrow);
  expect((await day("October 23")).getAttribute("aria-pressed")).toBe("false");
});

test("a tap on a number Day adds the Step; a long press opens the input", async () => {
  const router = renderPage(demoHabitIds.water);

  expect((await day("October 22")).getAttribute("aria-label")).toMatch(/: 5 of 8 glasses$/);
  await touch(await day("October 22"));
  expect((await day("October 22")).getAttribute("aria-label")).toMatch(/: 6 of 8 glasses$/);

  const yesterday = await day("October 21");
  await touch(yesterday, { holdMs: 520 });
  expect(router.state.location.search).toMatchObject({
    entry: `${demoHabitIds.water}:2026-10-21`,
  });
  // The long press only opened the input: the value is the same.
  expect(yesterday.getAttribute("aria-label")).toMatch(/: 3 of 8 glasses$/);
});

test.each([
  ["choice", demoHabitIds.gym],
  ["scale", demoHabitIds.mood],
  ["text", demoHabitIds.journal],
])("a tap on a %s Day opens the input", async (_kind, habitId) => {
  const router = renderPage(habitId);

  await touch(await day("October 19"));
  expect(router.state.location.search).toMatchObject({ entry: `${habitId}:2026-10-19` });
});

test("a Month in the grid moves the calendar there; the arrows and Today page", async () => {
  renderPage(demoHabitIds.water);

  const grid = await screen.findByRole("region", { name: "The last 12 months" });
  fireEvent.click(within(grid).getByRole("button", { name: "March 2026" }));
  expect(await screen.findByRole("heading", { name: "March 2026" })).toBeTruthy();
  expect(
    within(grid).getByRole("button", { name: "March 2026" }).getAttribute("aria-current"),
  ).toBe("true");

  fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
  expect(await screen.findByRole("heading", { name: "February 2026" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Today" }));
  expect(await screen.findByRole("heading", { name: "October 2026" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Today" })).toBeNull();
});

test("the picker moves the calendar to a month of any year, never past this month", async () => {
  act(() => setValue("month-picker", "Sheet"));
  const router = renderPage(demoHabitIds.water);

  await screen.findByRole("heading", { name: "October 2026" });
  fireEvent.click(screen.getByRole("button", { name: "October 2026, choose a month" }));
  const picker = await screen.findByRole("dialog");
  expect(router.state.location.search).toMatchObject({ monthPicker: true });
  // November 2026 has not come yet.
  expect(
    (within(picker).getByRole("button", { name: "November 2026" }) as HTMLButtonElement).disabled,
  ).toBe(true);

  // A year shows its months and keeps the picker open.
  fireEvent.click(within(picker).getByRole("button", { name: "2025" }));
  expect(within(picker).getByRole("button", { name: "2025" }).getAttribute("aria-pressed")).toBe(
    "true",
  );
  const november = within(picker).getByRole("button", { name: "November 2025" });
  expect((november as HTMLButtonElement).disabled).toBe(false);
  expect(router.state.location.search).toMatchObject({ monthPicker: true });

  // A month moves the calendar there and closes the picker.
  fireEvent.click(november);
  expect(await screen.findByRole("heading", { name: "November 2025" })).toBeTruthy();
  await vi.waitFor(() => expect(router.state.location.search.monthPicker).toBeUndefined());
});

test("the calendar zooms out to the months of its year, and into any of them", async () => {
  renderPage(demoHabitIds.water);

  await screen.findByRole("heading", { name: "October 2026" });
  fireEvent.click(
    screen.getByRole("button", { name: "October 2026, show the months of the year" }),
  );
  const thisYear = await screen.findByRole("group", { name: "2026" });
  expect(
    within(thisYear).getByRole("button", { name: "October 2026" }).getAttribute("aria-current"),
  ).toBe("true");
  // November 2026 has not come yet, and neither has 2027.
  expect(
    (within(thisYear).getByRole("button", { name: "November 2026" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect((screen.getByRole("button", { name: "Next year" }) as HTMLButtonElement).disabled).toBe(
    true,
  );

  // The arrows flip the year; a month shows its Days.
  fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
  const lastYear = await screen.findByRole("group", { name: "2025" });
  fireEvent.click(within(lastYear).getByRole("button", { name: "March 2025" }));
  expect(await screen.findByRole("heading", { name: "March 2025" })).toBeTruthy();
  expect(await day("March 5")).toBeTruthy();
  expect(screen.queryByRole("group", { name: "2025" })).toBeNull();

  // Escape goes back into the open Month.
  fireEvent.click(screen.getByRole("button", { name: "March 2025, show the months of the year" }));
  const again = await screen.findByRole("group", { name: "2025" });
  fireEvent.keyDown(within(again).getByRole("button", { name: "March 2025" }), { key: "Escape" });
  expect(await screen.findByRole("heading", { name: "March 2025" })).toBeTruthy();
  await vi.waitFor(() => expect(screen.queryByRole("group", { name: "2025" })).toBeNull());
});

test("the keyboard moves between Days and Months at once", async () => {
  renderPage(demoHabitIds.meditate);

  // One Day is the Tab stop of the calendar: today.
  const today = await day("October 22");
  expect(today.tabIndex).toBe(0);
  act(() => today.focus());

  fireEvent.keyDown(today, { key: "ArrowUp" });
  expect(document.activeElement).toBe(await day("October 15"));
  fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
  fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
  fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
  // Into September, without a slide to wait for.
  expect(screen.getByRole("heading", { name: "September 2026" })).toBeTruthy();
  expect(document.activeElement).toBe(await day("September 24"));

  fireEvent.keyDown(document.activeElement!, { key: "PageUp" });
  expect(document.activeElement).toBe(await day("August 24"));
  // Enter on a Day is a tap.
  const before = (document.activeElement as HTMLElement).getAttribute("aria-pressed");
  fireEvent.click(document.activeElement!, { detail: 0 });
  expect((await day("August 24")).getAttribute("aria-pressed")).not.toBe(before);
});

test("the Days of an older Month take no input until the Month loads", async () => {
  // The fake provider keeps everything in memory; this one says that older Months still load.
  const loading = (children: ReactNode) => <LoadingOlderMonths>{children}</LoadingOlderMonths>;
  renderPage(demoHabitIds.meditate, loading);

  // The live window starts in October 2025; September 2025 is older.
  const grid = await screen.findByRole("region", { name: "The last 12 months" });
  fireEvent.click(within(grid).getByRole("button", { name: "October 2025" }));
  await screen.findByRole("heading", { name: "October 2025" });
  fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
  await screen.findByRole("heading", { name: "September 2025" });
  await wait(600);

  const first = await day("September 1");
  expect((first as HTMLButtonElement).disabled).toBe(true);
  expect(first.getAttribute("aria-label")).toMatch(/: loading$/);
});

test.each([
  ["an unknown", "019a0000-0000-7000-8000-999999999999" as HabitId],
  ["a deleted", demoHabitIds.water],
])("%s habit shows a way back", async (_case, habitId) => {
  const initial = demoState(TODAY);
  const water = initial.habits[demoHabitIds.water]!;
  initial.habits[demoHabitIds.water] = { ...water, deletedAt: 1 };
  renderPage(habitId, undefined, { initial });

  expect(await screen.findByRole("heading", { name: "This habit is not here" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Water" })).toBeNull();
  for (const link of screen.getAllByRole("link", { name: "Back to habits" })) {
    expect(link.getAttribute("href")).toBe("/");
  }
});

test("until the data comes, the page shows its shape and a way back", async () => {
  // The owner is signed in, and neither the snapshot nor the live data is there yet. (While the
  // sign-in loads, the app shows its own loading screen instead of the page.)
  renderPage(demoHabitIds.water, (children) => <NoDataYet>{children}</NoDataYet>);

  expect(await screen.findByLabelText("Loading the habit")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to habits" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "This habit is not here" })).toBeNull();
});

function NoDataYet({ children }: { children: ReactNode }) {
  const api = use(HabitDataContext)!;
  const value: HabitDataApi = { ...api, source: "none", state: emptyState() };
  return <HabitDataContext.Provider value={value}>{children}</HabitDataContext.Provider>;
}

function LoadingOlderMonths({ children }: { children: ReactNode }) {
  const api = use(HabitDataContext)!;
  const value: HabitDataApi = {
    ...api,
    monthStatus: (month) => (month < "2025-10" ? "loading" : "ready"),
  };
  return <HabitDataContext.Provider value={value}>{children}</HabitDataContext.Provider>;
}
