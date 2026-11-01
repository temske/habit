import {
  visibleHabits,
  type Day,
  type Habit,
  type HabitId,
  type HabitState,
  type Option,
} from "@habit/core";
import { useHabitState } from "@habit/data";
import { demoHabitIds, demoState, FakeHabitDataProvider } from "@habit/data/testing";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test } from "vite-plus/test";

import { createAppRouter } from "@/router";

const TODAY = "2026-10-22" as Day;

/** Renders the app at `path` on the fake provider, and gives access to its data. */
function renderApp(path: string, initial: HabitState = demoState(TODAY)) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  const data = { state: initial };
  function Probe() {
    data.state = useHabitState();
    return null;
  }
  render(
    <FakeHabitDataProvider initial={initial} today={TODAY}>
      <Probe />
      <RouterProvider router={router} />
    </FakeHabitDataProvider>,
  );
  return {
    router,
    habits: () => visibleHabits(data.state),
    habit: (id: HabitId) => data.state.habits[id]!,
    named: (name: string) => Object.values(data.state.habits).find((h) => h.name === name),
  };
}

const sheet = () => screen.findByRole("dialog");
const type = (element: HTMLElement, value: string) =>
  fireEvent.change(element, { target: { value } });
const offeredLabels = (habit: Habit | undefined) =>
  habit !== undefined && (habit.kind === "choice" || habit.kind === "scale")
    ? habit.options.filter((o) => o.retiredAt === undefined).map((o) => o.label)
    : [];

async function startNew(name: string, kind?: string) {
  const dialog = await sheet();
  type(within(dialog).getByRole("textbox", { name: "Name" }), name);
  if (kind !== undefined) fireEvent.click(within(dialog).getByRole("radio", { name: kind }));
  return dialog;
}

describe("create", () => {
  test("a check habit is added, and the sheet closes", async () => {
    const app = renderApp("/?new=true");
    const dialog = await startNew("Stretch");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));

    const habit = app.named("Stretch");
    expect(habit?.kind).toBe("check");
    expect(app.habits().at(-1)?.name).toBe("Stretch");
    await waitFor(() => expect(app.router.state.location.search).not.toHaveProperty("new"));
  });

  test("a text habit keeps its description and its direction", async () => {
    const app = renderApp("/?new=true");
    const dialog = await startNew("Notes", "Text");
    type(within(dialog).getByRole("textbox", { name: "Description" }), "  One line a day  ");
    fireEvent.click(within(dialog).getByRole("radio", { name: "Quit" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));

    expect(app.named("Notes")).toMatchObject({
      kind: "text",
      description: "One line a day",
      direction: "quit",
    });
  });

  test("a number habit gets its unit, target and step", async () => {
    const app = renderApp("/?new=true");
    const dialog = await startNew("Sleep more", "Number");

    type(await within(dialog).findByLabelText("Unit"), "h");
    type(within(dialog).getByLabelText("Target"), "7,5");
    type(within(dialog).getByLabelText("Step"), "0.5");
    expect(within(dialog).getByText("15 taps fill the day.")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));

    expect(app.named("Sleep more")).toMatchObject({
      kind: "number",
      unit: "h",
      target: 7.5,
      step: 0.5,
    });
  });

  test("a quit number habit calls its target a limit, and may have none", async () => {
    const app = renderApp("/?new=true");
    const dialog = await startNew("Sugar", "Number");
    fireEvent.click(within(dialog).getByRole("radio", { name: "Quit" }));

    expect(await within(dialog).findByLabelText("Limit")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));

    const habit = app.named("Sugar");
    expect(habit).toMatchObject({ kind: "number", direction: "quit", step: 1 });
    expect(habit).not.toHaveProperty("target");
  });

  test("a choice habit gets the options that have a label", async () => {
    const app = renderApp("/?new=true");
    const dialog = await startNew("Drink", "Choice");

    type(await within(dialog).findByRole("textbox", { name: "Option 1 of 1" }), "Tea");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add option" }));
    type(within(dialog).getByRole("textbox", { name: "Option 2 of 2" }), "Coffee");
    fireEvent.click(within(dialog).getByRole("button", { name: "Emoji for Coffee" }));
    fireEvent.click(await within(dialog).findByRole("button", { name: "☕" }));
    // A row that was added and left empty is not an option.
    fireEvent.click(await within(dialog).findByRole("button", { name: "Add option" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));

    const habit = app.named("Drink");
    expect(habit?.kind).toBe("choice");
    expect(offeredLabels(habit)).toEqual(["Tea", "Coffee"]);
    expect((habit as { options: Option[] }).options[1]?.emoji).toBe("☕");
  });

  test("a scale habit keeps the order of its options, also after a move", async () => {
    const app = renderApp("/?new=true");
    const dialog = await startNew("Energy", "Scale");

    type(await within(dialog).findByRole("textbox", { name: "Option 1 of 2" }), "Low");
    type(within(dialog).getByRole("textbox", { name: "Option 2 of 2" }), "High");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add option" }));
    type(within(dialog).getByRole("textbox", { name: "Option 3 of 3" }), "Okay");
    fireEvent.keyDown(within(dialog).getByRole("button", { name: "Move Okay" }), {
      key: "ArrowUp",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));

    const habit = app.named("Energy");
    expect(habit?.kind).toBe("scale");
    expect(offeredLabels(habit)).toEqual(["Low", "Okay", "High"]);
  });

  test("Return in the name adds a check habit, and goes on to the fields of a number", async () => {
    const app = renderApp("/?new=true");
    const dialog = await startNew("Pages", "Number");
    fireEvent.keyDown(within(dialog).getByRole("textbox", { name: "Name" }), { key: "Enter" });
    expect(document.activeElement).toBe(within(dialog).getByLabelText("Unit"));

    fireEvent.click(within(dialog).getByRole("radio", { name: "Check" }));
    fireEvent.keyDown(within(dialog).getByRole("textbox", { name: "Name" }), { key: "Enter" });
    expect(app.named("Pages")?.kind).toBe("check");
  });

  test("a new habit goes after the last one, also after a deleted one", async () => {
    const initial = demoState(TODAY);
    const last = visibleHabits(initial).at(-1)!;
    initial.habits[last.id] = { ...last, deletedAt: 1 };
    const app = renderApp("/?new=true", initial);
    const dialog = await startNew("Walk");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));

    expect(app.named("Walk")!.order > last.order).toBe(true);
  });

  test("the icon picker unfolds in the form, and a pick folds it and keeps the name", async () => {
    const app = renderApp("/?new=true");
    const dialog = await startNew("Stretch");
    const tile = within(dialog).getByRole("button", { name: "Change icon" });
    fireEvent.click(tile);
    // The form stays while the picker is open.
    type(await within(dialog).findByRole("searchbox"), "run");
    expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveProperty(
      "value",
      "Stretch",
    );

    fireEvent.click(await within(dialog).findByRole("button", { name: "🏃" }));
    await waitFor(() => expect(within(dialog).queryByRole("searchbox")).toBeNull());
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));
    expect(app.named("Stretch")?.icon).toEqual({ type: "emoji", emoji: "🏃" });
  });

  test("a second tap on the icon folds the picker away without a change", async () => {
    renderApp("/?new=true");
    const dialog = await startNew("Stretch");
    const tile = within(dialog).getByRole("button", { name: "Change icon" });
    fireEvent.click(tile);
    await within(dialog).findByRole("searchbox");
    fireEvent.click(tile);
    await waitFor(() => expect(within(dialog).queryByRole("searchbox")).toBeNull());
  });
});

describe("validation", () => {
  test("a habit without a name is not added, and the sheet says why", async () => {
    const app = renderApp("/?new=true");
    const dialog = await sheet();
    const count = app.habits().length;
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));

    expect(await within(dialog).findByText("Give the habit a name.")).toBeTruthy();
    expect(app.habits()).toHaveLength(count);
  });

  test("a name over 60 characters is refused at once", async () => {
    renderApp("/?new=true");
    const dialog = await startNew("x".repeat(61));
    expect(await within(dialog).findByText("Keep the name to 60 characters.")).toBeTruthy();
  });

  test("an option label over 40 characters is refused at once", async () => {
    const app = renderApp("/?new=true");
    const dialog = await startNew("Drink", "Choice");
    type(await within(dialog).findByRole("textbox", { name: "Option 1 of 1" }), "x".repeat(41));
    expect(await within(dialog).findByText("Keep each label to 40 characters.")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));
    expect(app.named("Drink")).toBeUndefined();
  });

  test("a step of 0 and a target that is not a number are refused", async () => {
    const app = renderApp("/?new=true");
    const dialog = await startNew("Pages", "Number");
    type(await within(dialog).findByLabelText("Step"), "0");
    type(within(dialog).getByLabelText("Target"), "ten");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));

    expect(await within(dialog).findByText("The step is a number above 0.")).toBeTruthy();
    expect(within(dialog).getByText("The target is a number above 0, or empty.")).toBeTruthy();
    expect(app.named("Pages")).toBeUndefined();
  });

  test("a scale needs two options with different labels", async () => {
    const app = renderApp("/?new=true");
    const dialog = await startNew("Focus", "Scale");
    type(await within(dialog).findByRole("textbox", { name: "Option 1 of 2" }), "Deep");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add habit" }));
    expect(await within(dialog).findByText("A scale needs at least 2 options.")).toBeTruthy();

    type(within(dialog).getByRole("textbox", { name: "Option 2 of 2" }), " deep ");
    expect(await within(dialog).findByText("Two options have the same label.")).toBeTruthy();
    expect(app.named("Focus")).toBeUndefined();
  });
});

describe("edit", () => {
  test("each change applies at once, without a save button", async () => {
    const app = renderApp(`/?edit=${demoHabitIds.water}`);
    const dialog = await sheet();
    expect(within(dialog).queryByRole("button", { name: /save/i })).toBeNull();

    fireEvent.click(within(dialog).getByRole("radio", { name: "Rose" }));
    expect(app.habit(demoHabitIds.water).color).toBe("rose");

    type(within(dialog).getByRole("textbox", { name: "Name" }), "Hydrate ");
    await waitFor(() => expect(app.habit(demoHabitIds.water).name).toBe("Hydrate"));

    type(within(dialog).getByLabelText("Target"), "");
    await waitFor(() => expect(app.habit(demoHabitIds.water)).not.toHaveProperty("target"));
  });

  test("a value that is not valid is not saved; the habit keeps the last valid one", async () => {
    const app = renderApp(`/?edit=${demoHabitIds.water}`);
    const dialog = await sheet();
    const name = within(dialog).getByRole("textbox", { name: "Name" });
    type(name, "");
    fireEvent.blur(name);
    type(within(dialog).getByLabelText("Step"), "0");
    fireEvent.blur(within(dialog).getByLabelText("Step"));

    expect(await within(dialog).findByText("Give the habit a name.")).toBeTruthy();
    expect(within(dialog).getByText("The step is a number above 0.")).toBeTruthy();
    expect(app.habit(demoHabitIds.water)).toMatchObject({ name: "Water", step: 1 });
  });

  test("a close right after typing keeps the last letters", async () => {
    const app = renderApp(`/?edit=${demoHabitIds.read}`);
    const dialog = await sheet();
    type(within(dialog).getByRole("textbox", { name: "Name" }), "Read a book");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    // No wait for the pause after typing: the close saves at once.
    expect(app.habit(demoHabitIds.read).name).toBe("Read a book");
  });

  test("the kind cannot change", async () => {
    renderApp(`/?edit=${demoHabitIds.water}`);
    const dialog = await sheet();
    expect(within(dialog).queryByRole("radiogroup", { name: "Kind" })).toBeNull();
    expect(within(dialog).getByText("Number")).toBeTruthy();
  });

  test("an option that entries use is retired, an unused one is removed", async () => {
    const app = renderApp(`/?edit=${demoHabitIds.gym}`);
    const dialog = await sheet();

    fireEvent.click(within(dialog).getByRole("button", { name: "Remove Legs" }));
    const gym = () => app.habit(demoHabitIds.gym) as Habit & { options: Option[] };
    expect(gym().options.find((o) => o.label === "Legs")?.retiredAt).toBeTypeOf("number");
    expect(offeredLabels(gym())).toEqual(["Push", "Pull", "Cardio"]);
    expect(within(dialog).getByRole("button", { name: "Restore Legs" })).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Add option" }));
    type(within(dialog).getByRole("textbox", { name: "Option 4 of 4" }), "Yoga");
    await waitFor(() => expect(offeredLabels(gym())).toContain("Yoga"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove Yoga" }));
    expect(gym().options.some((o) => o.label === "Yoga")).toBe(false);

    fireEvent.click(within(dialog).getByRole("button", { name: "Restore Legs" }));
    expect(offeredLabels(gym())).toEqual(["Legs", "Push", "Pull", "Cardio"]);
  });

  test("an option's emoji comes from the emoji picker, and can be left out", async () => {
    const app = renderApp(`/?edit=${demoHabitIds.gym}`);
    const dialog = await sheet();
    const push = () =>
      (app.habit(demoHabitIds.gym) as Habit & { options: Option[] }).options.find(
        (o) => o.label === "Push",
      );

    expect(push()?.emoji).toBeDefined();
    fireEvent.click(within(dialog).getByRole("button", { name: /^Emoji for Push/ }));
    fireEvent.click(await within(dialog).findByRole("button", { name: "No emoji" }));
    await waitFor(() => expect(push()?.emoji).toBeUndefined());

    fireEvent.click(await within(dialog).findByRole("button", { name: "Emoji for Push" }));
    type(await within(dialog).findByRole("searchbox"), "run");
    fireEvent.click(await within(dialog).findByRole("button", { name: "🏃" }));
    await waitFor(() => expect(push()?.emoji).toBe("🏃"));
  });

  test("a stale link to a habit that does not exist closes the sheet", async () => {
    const app = renderApp("/?edit=nope");
    await waitFor(() => expect(app.router.state.location.search).not.toHaveProperty("edit"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("delete", () => {
  test("deletes without a confirmation, and the toast undoes it", async () => {
    const app = renderApp(`/?edit=${demoHabitIds.meditate}`);
    const dialog = await sheet();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete habit" }));

    expect(app.habit(demoHabitIds.meditate).deletedAt).toBeTypeOf("number");
    expect(app.habits().some((h) => h.id === demoHabitIds.meditate)).toBe(false);
    await waitFor(() => expect(app.router.state.location.search).not.toHaveProperty("edit"));

    expect(await screen.findByText("Deleted “Meditate”")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(app.habit(demoHabitIds.meditate).deletedAt).toBeUndefined();
  });

  test("on the page of the deleted habit, the app goes to the list", async () => {
    const id = demoHabitIds.journal;
    const app = renderApp(`/habits/${id}?edit=${id}`);
    const dialog = await sheet();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete habit" }));

    await waitFor(() => expect(app.router.state.location.pathname).toBe("/"));
    expect(app.router.state.location.search).not.toHaveProperty("edit");
  });
});
