import type { HabitColor, HabitIcon as HabitIconValue } from "@habit/core";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { HabitIcon, PHOSPHOR_ICON_GROUPS, preloadHabitIcons } from "@/components/habit-icon";
import { habitColorStyle } from "@/components/palette";
import { cn } from "@/lib/utils";

import { fieldClass, Segmented, SectionLabel } from "./controls";
import { firstEmoji, HABIT_EMOJI, searchEmoji, searchIcons } from "./icon-search";

const ALL_ICONS: HabitIconValue[] = PHOSPHOR_ICON_GROUPS.flatMap((group) =>
  group.names.map((name) => ({ type: "phosphor" as const, name })),
);

/**
 * The icon picker: the curated Phosphor icons by group, or a short list of emoji, and one search
 * field over both. Any emoji typed into the search (from the emoji keyboard) can be used as it is.
 * A tap picks and goes back. With `emojiOnly`, it offers emoji alone, as an Option's icon is.
 */
export function IconPicker({
  value,
  color,
  onPick,
  onClear,
  autoFocus,
  emojiOnly = false,
}: {
  value: HabitIconValue | undefined;
  color: HabitColor;
  onPick: (icon: HabitIconValue) => void;
  /** Offers "No emoji" first in the emoji grid, for an icon that may be left out. */
  onClear?: () => void;
  /** Focus the search field: on a desktop, where no keyboard covers the grid. */
  autoFocus: boolean;
  emojiOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [pickedTab, setTab] = useState<"icons" | "emoji">(
    value?.type === "phosphor" ? "icons" : "emoji",
  );
  const tab = emojiOnly ? "emoji" : pickedTab;
  const search = useRef<HTMLInputElement>(null);

  // Load every icon of the catalog now (each is a small chunk), so the grid fills at once.
  useEffect(() => {
    if (!emojiOnly) return preloadHabitIcons(ALL_ICONS);
  }, [emojiOnly]);
  useEffect(() => {
    if (autoFocus) search.current?.focus();
  }, [autoFocus]);

  const trimmed = query.trim();
  const typedEmoji = firstEmoji(trimmed);
  const icons = trimmed === "" || emojiOnly ? [] : searchIcons(trimmed);
  const emoji = trimmed === "" ? [] : searchEmoji(trimmed);

  return (
    <div className="flex flex-col gap-3" style={habitColorStyle(color)}>
      {/* In the two columns of a wide form, the search and the tabs share a row. */}
      <div className="flex flex-col gap-3 min-[60rem]:flex-row min-[60rem]:items-center">
        <div className="relative min-[60rem]:flex-1">
          <MagnifyingGlassIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 size-[1.125rem] text-ink-3"
          />
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={emojiOnly ? "Search emoji, or type one" : "Search icons, or type an emoji"}
            placeholder="Search, or type an emoji"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const first: HabitIconValue | undefined =
                typedEmoji !== undefined
                  ? { type: "emoji", emoji: typedEmoji }
                  : icons[0] !== undefined
                    ? { type: "phosphor", name: icons[0] }
                    : emoji[0] !== undefined
                      ? { type: "emoji", emoji: emoji[0] }
                      : undefined;
              if (first !== undefined) onPick(first);
            }}
            className={cn(fieldClass, "pr-11 pl-10 [&::-webkit-search-cancel-button]:hidden")}
          />
          {query === "" ? null : (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                search.current?.focus();
              }}
              aria-label="Clear the search"
              className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:text-ink"
            >
              <XIcon weight="bold" aria-hidden className="text-[0.875rem]" />
            </button>
          )}
        </div>

        {trimmed === "" && !emojiOnly ? (
          <Segmented
            label="Icon type"
            hideLabel
            value={tab}
            onChange={setTab}
            options={[
              { value: "icons", label: "Icons" },
              { value: "emoji", label: "Emoji" },
            ]}
            className="min-[60rem]:w-64"
          />
        ) : null}
      </div>

      {/* The sheets put the button right under the grid, so the grid is cut at the button's top
          edge; the space at the end of the scroll keeps the last row off the button. */}
      <div
        className="-mx-1 h-[min(21rem,46dvh)] overflow-y-auto overscroll-contain px-1 pb-4"
        onKeyDown={moveFocusInGrid}
      >
        {trimmed !== "" ? (
          <SearchResults
            query={trimmed}
            typedEmoji={typedEmoji}
            icons={icons}
            emoji={emoji}
            noun={emojiOnly ? "emoji" : "icon"}
            value={value}
            color={color}
            onPick={onPick}
          />
        ) : tab === "icons" ? (
          PHOSPHOR_ICON_GROUPS.map((group) => (
            <section key={group.label} className="mb-3 last:mb-0">
              <SectionLabel>{group.label}</SectionLabel>
              <Grid>
                {group.names.map((name) => (
                  <IconCell
                    key={name}
                    icon={{ type: "phosphor", name }}
                    value={value}
                    color={color}
                    onPick={onPick}
                  />
                ))}
              </Grid>
            </section>
          ))
        ) : (
          <>
            <Grid>
              {onClear === undefined ? null : (
                <button
                  type="button"
                  data-icon-cell=""
                  onClick={onClear}
                  aria-label="No emoji"
                  aria-pressed={value === undefined}
                  className={cellClass(value === undefined)}
                >
                  <ProhibitIcon aria-hidden className="size-[1.375rem] text-ink-3" />
                </button>
              )}
              {HABIT_EMOJI.map((entry) => (
                <IconCell
                  key={entry.emoji}
                  icon={{ type: "emoji", emoji: entry.emoji }}
                  value={value}
                  color={color}
                  onPick={onPick}
                />
              ))}
            </Grid>
            <p className="mt-3 px-1 text-[0.875rem] leading-5 text-ink-3">
              For any other emoji, type it into the search.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function SearchResults({
  query,
  typedEmoji,
  icons,
  emoji,
  noun,
  value,
  color,
  onPick,
}: {
  query: string;
  typedEmoji: string | undefined;
  icons: string[];
  emoji: string[];
  noun: "icon" | "emoji";
  value: HabitIconValue | undefined;
  color: HabitColor;
  onPick: (icon: HabitIconValue) => void;
}) {
  const extra = typedEmoji !== undefined && !emoji.includes(typedEmoji) ? [typedEmoji] : [];
  if (icons.length === 0 && emoji.length === 0 && extra.length === 0) {
    return (
      <p className="px-1 pt-2 text-[0.9375rem] leading-6 text-ink-3">
        No {noun} for “{query}”. Try another word, or type an emoji.
      </p>
    );
  }
  return (
    <Grid>
      {extra.map((char) => (
        <IconCell
          key={`typed-${char}`}
          icon={{ type: "emoji", emoji: char }}
          value={value}
          color={color}
          onPick={onPick}
        />
      ))}
      {icons.map((name) => (
        <IconCell
          key={name}
          icon={{ type: "phosphor", name }}
          value={value}
          color={color}
          onPick={onPick}
        />
      ))}
      {emoji.map((char) => (
        <IconCell
          key={char}
          icon={{ type: "emoji", emoji: char }}
          value={value}
          color={color}
          onPick={onPick}
        />
      ))}
    </Grid>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div role="group" className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
      {children}
    </div>
  );
}

function IconCell({
  icon,
  value,
  color,
  onPick,
}: {
  icon: HabitIconValue;
  value: HabitIconValue | undefined;
  color: HabitColor;
  onPick: (icon: HabitIconValue) => void;
}) {
  const selected =
    icon.type === value?.type &&
    (icon.type === "emoji"
      ? icon.emoji === (value as { emoji: string }).emoji
      : icon.name === (value as { name: string }).name);
  return (
    <button
      type="button"
      data-icon-cell=""
      onClick={() => onPick(icon)}
      aria-label={icon.type === "emoji" ? icon.emoji : humanize(icon.name)}
      aria-pressed={selected}
      className={cellClass(selected)}
    >
      <HabitIcon icon={icon} color={color} size="1.625rem" />
    </button>
  );
}

/** A cell of the grid. The chosen one takes 18% of the habit color and a ring at 70%. */
function cellClass(selected: boolean): string {
  return cn(
    "grid aspect-square min-h-11 place-items-center squircle-[0.625rem] transition-[background-color,scale] duration-150 ease-out active:scale-[0.95] hover:bg-surface-2",
    selected &&
      "bg-[color-mix(in_oklab,var(--c)_18%,var(--surface))] shadow-[inset_0_0_0_0.09375rem_color-mix(in_oklab,var(--c)_70%,transparent)] hover:bg-[color-mix(in_oklab,var(--c)_18%,var(--surface))]",
  );
}

function humanize(name: string): string {
  const words = name.replaceAll("-", " ");
  return words[0]!.toUpperCase() + words.slice(1);
}

/** The arrow keys move the focus between the cells of the grid, as in a native picker. */
function moveFocusInGrid(event: KeyboardEvent<HTMLDivElement>) {
  const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
  const current = event.target as HTMLElement;
  if (!keys.includes(event.key) || !current.hasAttribute("data-icon-cell")) return;
  const cells = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-icon-cell]"));
  const index = cells.indexOf(current);
  const columns = Math.max(
    1,
    Array.from(current.parentElement?.children ?? []).filter(
      (cell) => (cell as HTMLElement).offsetTop === current.offsetTop,
    ).length,
  );
  const by =
    event.key === "ArrowLeft"
      ? -1
      : event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp"
          ? -columns
          : columns;
  const next = cells[index + by];
  if (next === undefined) return;
  event.preventDefault();
  next.focus();
}

/** The emoji of an Option: the emoji alone, and "No emoji" first. */
export function OptionEmojiPicker({
  emoji,
  color,
  onPick,
  autoFocus,
}: {
  emoji: string | undefined;
  color: HabitColor;
  onPick: (emoji: string | undefined) => void;
  autoFocus: boolean;
}) {
  return (
    <IconPicker
      emojiOnly
      value={emoji === undefined ? undefined : { type: "emoji", emoji }}
      color={color}
      onPick={(icon) => onPick(icon.type === "emoji" ? icon.emoji : undefined)}
      onClear={() => onPick(undefined)}
      autoFocus={autoFocus}
    />
  );
}
