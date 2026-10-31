/**
 * The end-to-end check of the web app on the real backend: the Convex dev deployment and the Clerk
 * development instance, in Google Chrome. It needs the network and the Convex CLI's login, so it
 * is not part of `vp run ready`.
 *
 *   vp -C apps/web run e2e
 *
 * It deletes the data of the owner test user, starts a dev server with VITE_HABIT_DATA=convex,
 * signs in with the email code of the test users, and goes through v1: a habit of each Kind, a
 * tap, a paint and its Undo, the input of a value, a reorder, the habit page and its calendar, an
 * edit, a delete and its Undo, the instant start from the snapshot, the data after a new sign-in,
 * and "no access" for the guest. At the end it deletes the owner test user's data again.
 * Screenshots go to $E2E_SHOTS (default: <tmp>/habit-e2e).
 *
 * Settings, all optional: E2E_URL (use a running dev server on the real backend instead of
 * starting one), E2E_PORT (default 5433), E2E_HEADED=true (show the browser), E2E_CHROME (the
 * path of a Chrome or Chromium binary, instead of the installed Google Chrome).
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { loadEnv } from "vite-plus";

const OWNER = {
  email: "habit-owner+clerk_test@example.com",
  id: "user_3L3tBtYfJHjf9ZrdScO5oy8SQwe",
};
const GUEST = {
  email: "habit-guest+clerk_test@example.com",
  id: "user_3L3tCVeHPMmD1xWFdL7i6Hk19qh",
};
/** Clerk accepts this code for an address with `+clerk_test` and sends no email. */
const CODE = "424242";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const WEB = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.env.E2E_PORT ?? 5433);
const BASE = process.env.E2E_URL ?? `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.E2E_SHOTS ?? join(tmpdir(), "habit-e2e");
const PHONE = { width: 390, height: 844 };

/** The phone list shows 5 Days; today is the last. */
const TODAY = 4;

const failures: string[] = [];
const pageErrors: string[] = [];
/** The page that the run drives now, for a screenshot when a step throws. */
let current: Page | null = null;

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  step("reset the owner's data");
  deleteOwnerData();

  const server = process.env.E2E_URL === undefined ? await startDevServer() : null;
  const browser = await chromium.launch({
    headless: process.env.E2E_HEADED !== "true",
    ...(process.env.E2E_CHROME === undefined
      ? { channel: "chrome" }
      : { executablePath: process.env.E2E_CHROME }),
  });
  try {
    await warmUp(browser);
    await ownerFlow(browser);
    await ownerAgain(browser);
    await guestFlow(browser);
  } catch (error) {
    await current?.screenshot({ path: join(SHOTS, "failure.png") }).catch(() => {});
    failures.push(
      `stopped: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
    );
  } finally {
    await browser.close();
    server?.stop();
    step("delete the owner's data again: the run leaves nothing on the deployment");
    try {
      deleteOwnerData();
    } catch (error) {
      failures.push(
        `the cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (pageErrors.length > 0) failures.push(`page errors:\n  ${pageErrors.join("\n  ")}`);
  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} failure(s):\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log(`\n✓ all checks passed. Screenshots: ${SHOTS}`);
  }
}

// ── The flows ──────────────────────────────────────────────────────────────────────────────────

async function ownerFlow(browser: Browser) {
  const context = await newContext(browser);
  const page = await newPage(context);

  step("signed out: the sign-in screen");
  await page.goto(BASE);
  await page.getByRole("button", { name: "Continue with Google" }).waitFor();
  await shot(page, "01-sign-in");

  step("sign in as the owner with the email code");
  await signInWithCode(page, OWNER.email);

  step("no habits: the create sheet opens by itself; create a habit of each Kind");
  await createHabit(page, { name: "Stretch", kind: "Check" });
  await page.getByRole("button", { name: "New habit" }).click();
  await createHabit(page, {
    name: "Water",
    kind: "Number",
    async details(page) {
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Unit").fill("glasses");
      await dialog.getByLabel("Target").fill("8");
    },
  });
  await page.getByRole("button", { name: "New habit" }).click();
  await createHabit(page, {
    name: "Gym",
    kind: "Choice",
    async details(page) {
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("textbox", { name: "Option 1 of 1" }).fill("Legs");
      await dialog.getByRole("button", { name: "Add option" }).click();
      await dialog.getByRole("textbox", { name: "Option 2 of 2" }).fill("Push");
    },
  });
  await page.getByRole("button", { name: "New habit" }).click();
  await createHabit(page, {
    name: "Mood",
    kind: "Scale",
    async details(page) {
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("textbox", { name: "Option 1 of 2" }).fill("Low");
      await dialog.getByRole("textbox", { name: "Option 2 of 2" }).fill("High");
    },
  });
  await page.getByRole("button", { name: "New habit" }).click();
  await createHabit(page, { name: "Journal", kind: "Text" });
  await check("the list has the five habits in the order of creation", async () =>
    same(await habitNames(page), ["Stretch", "Water", "Gym", "Mood", "Journal"]),
  );
  await shot(page, "02-list-created");

  step("tap: a check toggles, a number adds its Step");
  await square(page, "Stretch", TODAY).click();
  await expectLabel(page, "Stretch", TODAY, /: done$/);
  await square(page, "Water", TODAY).click();
  await square(page, "Water", TODAY).click();
  await expectLabel(page, "Water", TODAY, /: 2 of 8 glasses$/);

  step("paint four Days of a check habit, then Undo");
  await drag(page, "Stretch", 0, 3);
  for (const index of [0, 1, 2, 3]) await expectLabel(page, "Stretch", index, /: done$/);
  await page.getByText("Painted 4 days").waitFor();
  await shot(page, "03-painted");
  await page.getByRole("button", { name: "Undo" }).click();
  for (const index of [0, 1, 2, 3]) await expectLabel(page, "Stretch", index, /: no entry$/);
  await expectLabel(page, "Stretch", TODAY, /: done$/);

  step("the input of a value: number (long press), choice, scale, text");
  await longPress(page, "Water", 3);
  const value = page.getByRole("dialog").getByLabel("Value in glasses");
  await value.fill("5");
  await value.press("Enter");
  await shot(page, "04-value-input");
  // An open sheet hides the list from the accessibility tree: check after it closes.
  await closeSheet(page);
  await expectLabel(page, "Water", 3, /: 5 of 8 glasses$/);

  await square(page, "Gym", TODAY).click();
  await page.getByRole("dialog").getByRole("radio", { name: "Push" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await expectLabel(page, "Gym", TODAY, /: Push$/);

  await square(page, "Mood", TODAY).click();
  await page.getByRole("dialog").getByRole("radio", { name: "High" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await expectLabel(page, "Mood", TODAY, /: High$/);

  await square(page, "Journal", TODAY).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Journal, note" }).fill("A good day");
  await closeSheet(page);
  await expectLabel(page, "Journal", TODAY, /: A good day$/);

  step("reorder: drag Journal to the top");
  await reorder(page, "Journal", "Stretch");
  await check("Journal is first", async () =>
    same(await habitNames(page), ["Journal", "Stretch", "Water", "Gym", "Mood"]),
  );

  step("the habit page: the calendar takes a tap, the grid and the arrows page");
  await rowHead(page, "Water").click();
  await page.getByRole("heading", { level: 1, name: "Water" }).waitFor();
  // No wait for the transition from the row: a tap during it must count.
  const month = monthName(new Date());
  await page.getByRole("heading", { name: month }).waitFor();
  const todayButton = calendarDay(page, new Date());
  await tapCalendar(page, todayButton);
  await check("the calendar's tap added the Step", async () => {
    const actual = (await todayButton.getAttribute("aria-label")) ?? "";
    return actual.endsWith(": 3 of 8 glasses") || actual;
  });
  await shot(page, "05-habit-page");
  await page.getByRole("button", { name: "Previous month" }).click();
  const previous = new Date();
  previous.setDate(1);
  previous.setMonth(previous.getMonth() - 1);
  await page.getByRole("heading", { name: monthName(previous) }).waitFor();
  await page.getByRole("button", { name: "Today" }).click();
  await page.getByRole("heading", { name: month }).waitFor();
  const grid = page.getByRole("region", { name: "The last 12 months" });
  const firstMonth = grid.getByRole("button").first();
  const firstMonthName = (await firstMonth.getAttribute("aria-label")) ?? "";
  await firstMonth.click();
  await page.getByRole("heading", { name: firstMonthName }).waitFor();

  step("edit the name, then delete the habit and Undo");
  await page.getByRole("button", { name: "Edit" }).click();
  const name = page.getByRole("dialog").getByRole("textbox", { name: "Name" });
  await name.fill("Water 2");
  // The sheet hides the page from the accessibility tree; the name behind it changes at once.
  await page.locator(".hp-name", { hasText: /^Water 2$/ }).waitFor();
  await shot(page, "06-edit");
  await page.getByRole("dialog").getByRole("button", { name: "Delete habit" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.getByText("Deleted “Water 2”").waitFor();
  await check("the deleted habit left the list", async () => {
    const names = await habitNames(page);
    return !names.includes("Water 2") || names.join(", ");
  });
  await page.getByRole("button", { name: "Undo" }).click();
  await check("Undo brought it back in its place", async () =>
    same(await habitNames(page), ["Journal", "Stretch", "Water 2", "Gym", "Mood"]),
  );

  step("reload with the backend cut off: the snapshot starts the app");
  // The snapshot is saved 1 s after the live data last changed.
  await page.waitForTimeout(2000);
  const offline = await newPage(context);
  // The socket of Convex opens, but no message reaches the server and none comes back.
  await offline.routeWebSocket(/convex\.cloud/, () => {});
  const started = Date.now();
  await offline.goto(BASE);
  await offline.getByRole("group", { name: "Water 2" }).waitFor({ timeout: 10_000 });
  console.log(`  the list from the snapshot after ${Date.now() - started} ms, without the backend`);
  await expectLabel(offline, "Water 2", TODAY, /: 3 of 8 glasses$/);
  await shot(offline, "07-snapshot");
  await offline.close();

  step("a normal reload");
  const reload = Date.now();
  await page.reload();
  await page.getByRole("group", { name: "Water 2" }).waitFor();
  console.log(`  the list after ${Date.now() - reload} ms`);
  await context.close();
}

/** A new browser, a new sign-in: the data comes from the server, not from this device. */
async function ownerAgain(browser: Browser) {
  step("a new browser: sign in again, and the server has kept everything");
  const context = await newContext(browser);
  const page = await newPage(context);
  await page.goto(BASE);
  await signInWithCode(page, OWNER.email);
  await page.getByRole("group", { name: "Water 2" }).waitFor();
  await check("the order", async () =>
    same(await habitNames(page), ["Journal", "Stretch", "Water 2", "Gym", "Mood"]),
  );
  await expectLabel(page, "Stretch", TODAY, /: done$/);
  await expectLabel(page, "Stretch", 0, /: no entry$/);
  await expectLabel(page, "Water 2", TODAY, /: 3 of 8 glasses$/);
  await expectLabel(page, "Water 2", 3, /: 5 of 8 glasses$/);
  await expectLabel(page, "Gym", TODAY, /: Push$/);
  await expectLabel(page, "Mood", TODAY, /: High$/);
  await expectLabel(page, "Journal", TODAY, /: A good day$/);
  await shot(page, "08-list-again");
  await context.close();
}

async function guestFlow(browser: Browser) {
  step("the guest: no access, the user id, the command, and the sign-out");
  const context = await newContext(browser);
  const page = await newPage(context);
  await page.goto(BASE);
  await signInWithCode(page, GUEST.email);
  await page.getByRole("heading", { name: "No access" }).waitFor();
  await check("the user id is shown", async () => {
    const count = await page.getByText(GUEST.id, { exact: true }).count();
    return count === 1 || `${count} times`;
  });
  await check("the command names the guest", async () => {
    const command = (await page.getByText(/OWNER_USER_IDS/).textContent()) ?? "";
    return command.includes(GUEST.id) || command;
  });
  await shot(page, "09-no-access");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Continue with Google" }).waitFor();
  await context.close();
}

// ── Helpers ────────────────────────────────────────────────────────────────────────────────────

/**
 * Deletes every habit and Entry of the owner test user, and only of that user
 * (`admin:deleteUserData` reads by the user id). The deployment is the one that the dev server
 * talks to, from Vite's env of `apps/web`, so the reset needs no `packages/data/.env.local`.
 */
function deleteOwnerData() {
  const url = new URL(loadEnv("development", WEB, "VITE_").VITE_CONVEX_URL!);
  const deployment = url.hostname.split(".")[0]!;
  execFileSync(
    "vp",
    [
      "-C",
      "packages/data",
      "exec",
      "convex",
      "run",
      "--deployment",
      deployment,
      "admin:deleteUserData",
      JSON.stringify({ userId: OWNER.id }),
    ],
    { cwd: ROOT, stdio: "inherit" },
  );
}

function step(name: string) {
  console.log(`• ${name}`);
}

/**
 * A check that records a failure and lets the run go on. `test` returns true, or what it saw
 * instead, for the report.
 */
async function check(name: string, test: () => Promise<true | string>, timeoutMs = 8000) {
  const until = Date.now() + timeoutMs;
  let seen = "";
  for (;;) {
    const result = await test().catch((error: unknown) => String(error));
    if (result === true) return;
    seen = result;
    if (Date.now() > until) {
      failures.push(`${name} (saw: ${seen})`);
      console.error(`  ✗ ${name} (saw: ${seen})`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function same(actual: string[], expected: string[]): true | string {
  return actual.join("|") === expected.join("|") || actual.join(", ");
}

async function newContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: PHONE,
    colorScheme: "dark",
    deviceScaleFactor: 2,
  });
  // The dev server's lab panel (docs/lab.md) sits at the bottom left, over the sheets' buttons.
  // The run keeps each lab control on its first option, as a production build does.
  await context.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = 'aside[aria-label="Lab"] { display: none !important; }';
      document.head.append(style);
    });
  });
  return context;
}

async function newPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.on("pageerror", (error) => pageErrors.push(error.message));
  current = page;
  return page;
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

async function signInWithCode(page: Page, email: string) {
  await page.getByRole("button", { name: "Sign in with an email code" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("Code").fill(CODE);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function createHabit(
  page: Page,
  habit: { name: string; kind: string; details?: (page: Page) => Promise<void> },
) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Name" }).fill(habit.name);
  if (habit.kind !== "Check") await dialog.getByRole("radio", { name: habit.kind }).click();
  // The fields of the Kind come in on the same step, under the Kind.
  if (habit.details !== undefined) await habit.details(page);
  await dialog.getByRole("button", { name: "Add habit" }).click();
  await dialog.waitFor({ state: "detached" });
  await page.getByRole("group", { name: habit.name, exact: true }).waitFor();
}

async function habitNames(page: Page): Promise<string[]> {
  const groups = page.locator(".day-cells[role=group]");
  return groups.evaluateAll((elements) => elements.map((element) => element.ariaLabel ?? ""));
}

/** The icon and the name of a row: a tap opens the habit page, a drag reorders. */
function rowHead(page: Page, habit: string) {
  return page.locator(".habit-row-head").filter({ has: page.getByText(habit, { exact: true }) });
}

function square(page: Page, habit: string, index: number) {
  return page.getByRole("group", { name: habit, exact: true }).getByRole("button").nth(index);
}

async function expectLabel(page: Page, habit: string, index: number, label: RegExp) {
  await check(`${habit}, Day ${index}: ${label}`, async () => {
    const actual = (await square(page, habit, index).getAttribute("aria-label")) ?? "";
    return label.test(actual) || actual;
  });
}

async function center(page: Page, habit: string, index: number) {
  const box = await square(page, habit, index).boundingBox();
  if (box === null) throw new Error(`no square ${habit} ${index}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A press on one square and a drag along the row to another (a paint). */
async function drag(page: Page, habit: string, from: number, to: number) {
  const start = await center(page, habit, from);
  const end = await center(page, habit, to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}

async function longPress(page: Page, habit: string, index: number) {
  const point = await center(page, habit, index);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.getByRole("dialog").waitFor();
}

async function closeSheet(page: Page) {
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
}

/** Lifts a row by its name (a mouse drag of more than 6px) and drops it over another row. */
async function reorder(page: Page, habit: string, over: string) {
  const handle = await rowHead(page, habit).boundingBox();
  const target = await rowHead(page, over).boundingBox();
  if (handle === null || target === null) throw new Error("no rows to reorder");
  const x = handle.x + handle.width / 2;
  await page.mouse.move(x, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, handle.y + handle.height / 2 - 10, { steps: 4 });
  await page.mouse.move(x, target.y + target.height / 4, { steps: 20 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

function monthName(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** The button of a Day in the shown Month of the calendar. */
function calendarDay(page: Page, date: Date) {
  const label = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return page
    .getByRole("group", { name: monthName(date) })
    .getByRole("button", { name: new RegExp(`, ${label}:`) });
}

async function tapCalendar(page: Page, day: ReturnType<typeof calendarDay>) {
  const box = await day.boundingBox();
  if (box === null) throw new Error("no Day in the calendar");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/**
 * Loads the app once and waits for the network to rest: a dev server that has just started can
 * optimize its dependencies on the first load and reload the page, which fails a dynamic import
 * of the run itself.
 */
async function warmUp(browser: Browser) {
  const context = await newContext(browser);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await context.close();
}

/** A dev server of its own, in a process group, so that `stop` ends Vite too, not only vp. */
async function startDevServer(): Promise<{ stop: () => void }> {
  if (await answers(BASE)) {
    throw new Error(`${BASE} answers already: stop that server, or set E2E_URL to use it`);
  }
  step(`start the dev server on the real backend at ${BASE} (log: ${join(SHOTS, "dev.log")})`);
  const log = openSync(join(SHOTS, "dev.log"), "w");
  const server = spawn(
    "vp",
    ["-C", "apps/web", "dev", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
    {
      cwd: ROOT,
      env: { ...process.env, VITE_HABIT_DATA: "convex" },
      stdio: ["ignore", log, log],
      detached: true,
    },
  );
  const stop = () => {
    if (server.pid !== undefined) process.kill(-server.pid, "SIGTERM");
  };
  const until = Date.now() + 30_000;
  while (Date.now() < until) {
    if (await answers(BASE)) return { stop };
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  stop();
  throw new Error(`the dev server did not start at ${BASE}`);
}

async function answers(url: string): Promise<boolean> {
  return fetch(url).then(
    (response) => response.ok,
    () => false,
  );
}

await main();
