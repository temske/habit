---
name: Habit
description: A habit tracker on a bare ground, where each Day is a gauge that fills from the bottom and color appears only as data.
colors:
  # Neutrals, light theme (the default in CSS)
  ground: "oklch(1 0 0)"
  ink: "oklch(0.232 0.004 286)"
  ink-2: "oklch(0.403 0.008 286)"
  ink-3: "oklch(0.54 0.008 286)"
  ink-4: "oklch(0.557 0.008 286)"
  line: "oklch(0.896 0.005 286)"
  line-strong: "oklch(0.831 0.007 286)"
  surface: "oklch(1 0 0)"
  surface-2: "oklch(0.962 0.003 286)"
  surface-3: "oklch(0.935 0.005 286)"
  tile: "oklch(0.947 0.004 286)"
  field: "oklch(0.962 0.003 286)"
  backdrop: "oklch(0 0 0 / 0.2)"
  toast: "oklch(0.232 0.004 286)"
  toast-ink: "oklch(0.963 0.007 286)"
  # Neutrals, dark theme (prefers-color-scheme: dark)
  ground-dark: "oklch(0 0 0)"
  ink-dark: "oklch(0.963 0.007 286)"
  ink-2-dark: "oklch(0.787 0.007 286)"
  ink-3-dark: "oklch(0.648 0.007 286)"
  ink-4-dark: "oklch(0.588 0.006 286)"
  line-dark: "oklch(0.294 0.004 286)"
  line-strong-dark: "oklch(0.349 0.003 286)"
  surface-dark: "oklch(0.227 0.004 286)"
  surface-2-dark: "oklch(0.294 0.004 286)"
  surface-3-dark: "oklch(0.349 0.003 286)"
  tile-dark: "oklch(0.247 0.004 286)"
  field-dark: "oklch(0 0 0)"
  backdrop-dark: "oklch(0 0 0 / 0.6)"
  toast-dark: "oklch(0.227 0.004 286)"
  toast-ink-dark: "oklch(0.963 0.007 286)"
  # The habit palette, light theme
  habit-rose: "oklch(0.654 0.09 19.4)"
  habit-apricot: "oklch(0.649 0.086 59.9)"
  habit-ochre: "oklch(0.647 0.092 78)"
  habit-sand: "oklch(0.645 0.062 79)"
  habit-mustard: "oklch(0.643 0.095 100.4)"
  habit-olive: "oklch(0.638 0.096 125.9)"
  habit-green: "oklch(0.635 0.076 151.4)"
  habit-jade: "oklch(0.636 0.073 172.7)"
  habit-teal: "oklch(0.635 0.068 192)"
  habit-sky: "oklch(0.637 0.084 223.9)"
  habit-blue: "oklch(0.645 0.098 254.1)"
  habit-slate: "oklch(0.644 0.04 264.3)"
  habit-violet: "oklch(0.654 0.101 299.4)"
  habit-mauve: "oklch(0.653 0.065 336.3)"
  habit-raspberry: "oklch(0.657 0.094 358.2)"
  habit-stone: "oklch(0.643 0.012 67.6)"
  # The habit palette, dark theme
  habit-rose-dark: "oklch(0.704 0.086 19.4)"
  habit-apricot-dark: "oklch(0.753 0.082 59.9)"
  habit-ochre-dark: "oklch(0.739 0.087 78)"
  habit-sand-dark: "oklch(0.717 0.059 79)"
  habit-mustard-dark: "oklch(0.751 0.091 100.4)"
  habit-olive-dark: "oklch(0.748 0.091 125.9)"
  habit-green-dark: "oklch(0.707 0.073 151.4)"
  habit-jade-dark: "oklch(0.72 0.069 172.7)"
  habit-teal-dark: "oklch(0.739 0.065 192)"
  habit-sky-dark: "oklch(0.721 0.08 223.9)"
  habit-blue-dark: "oklch(0.679 0.094 254.1)"
  habit-slate-dark: "oklch(0.688 0.038 264.3)"
  habit-violet-dark: "oklch(0.694 0.096 299.4)"
  habit-mauve-dark: "oklch(0.735 0.061 336.3)"
  habit-raspberry-dark: "oklch(0.681 0.09 358.2)"
  habit-stone-dark: "oklch(0.699 0.011 67.6)"
typography:
  display:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: "2.75rem"
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  page-title:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "1.875rem"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: "1.375rem"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  control:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  description:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  caption:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1rem"
  label:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "0.9375rem"
  code:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.5rem"
rounded:
  gauge: "19%"
  icon: "18%"
  control: "0.625rem"
  row: "0.75rem"
  stepper: "0.875rem"
  popover: "0.875rem"
  dialog: "1rem"
  sheet: "1.25rem"
  pill: "9999px"
spacing:
  gutter: "1.25rem"
  gutter-narrow: "1rem"
  row: "3.375rem"
  icon: "1.375rem"
  square: "1.875rem"
  square-narrow: "1.75rem"
  square-gap: "0.375rem"
  square-gap-narrow: "0.3125rem"
  gap: "0.75rem"
  gap-tight: "0.5rem"
  touch: "2.75rem"
components:
  day-square:
    size: "{spacing.square}"
    rounded: "{rounded.gauge}"
  habit-icon:
    size: "{spacing.icon}"
  habit-row:
    height: "{spacing.row}"
    padding: "0 1.25rem"
  habit-name:
    textColor: "{colors.ink-2}"
    typography: "{typography.title}"
  habit-name-hover:
    textColor: "{colors.ink}"
  habit-row-lifted:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.row}"
  new-habit-button:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.row}"
    height: "3rem"
  new-habit-button-hover:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
  day-header:
    textColor: "{colors.ink-3}"
    typography: "{typography.label}"
  day-header-today:
    textColor: "{colors.ink}"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    width: "30rem"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    width: "22rem"
  popover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.popover}"
    width: "17rem"
  sheet-title:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
  sheet-description:
    textColor: "{colors.ink-3}"
    typography: "{typography.description}"
  sheet-close:
    textColor: "{colors.ink-3}"
    size: "{spacing.touch}"
    rounded: "{rounded.pill}"
  sheet-close-hover:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
  button:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    height: "{spacing.touch}"
    padding: "0 1rem"
  button-hover:
    backgroundColor: "{colors.surface-3}"
  button-active:
    backgroundColor: "{colors.surface-3}"
  button-disabled:
    textColor: "{colors.ink-4}"
  stepper:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.stepper}"
    size: "3.5rem"
  stepper-active:
    backgroundColor: "{colors.surface-3}"
  number-field:
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  text-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.75rem 0.875rem"
  option:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
    height: "2.875rem"
  option-checked:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
  toast:
    backgroundColor: "{colors.toast}"
    textColor: "{colors.toast-ink}"
    rounded: "{rounded.pill}"
    height: "2.875rem"
    padding: "0 0.5rem 0 1.375rem"
  toast-action:
    textColor: "{colors.toast-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    height: "2.25rem"
    padding: "0 0.875rem"
---

# Design System: Habit

## Overview

**Creative North Star: "Quiet Standard"**

The app is a bare ground with only data on it. In the light theme the ground is white. In the dark theme it is pure black. There are no cards, no panels and no dividers: space separates the rows. The only hue on the screen is the habit's own color, in its icon and in its Day gauges.

Each Day is a gauge: a squircle that fills from the bottom. An empty Day is a frame. A full Day is solid. This one shape carries the product, in the list, on the habit page and inside the inputs. The type is one family, IBM Plex Sans, in a small set of sizes. Hierarchy comes from weight and from four steps of ink.

The care goes into motion and touch, not into decoration. A value that rises springs up, and the square pulses to about 1.04. A value that falls drains without a bounce. On a phone, forms open as bottom sheets. On a desktop, they open as dialogs and popovers. The theme follows the system setting, and there is no switch. The desktop is the phone layout in a 600px column with a 20px base, and the page of a habit opens beside the list instead of in its place.

**Key Characteristics:**
- A bare ground: white or pure black, with no surfaces at rest except the "New habit" button.
- Color only where it is data: the habit icon and the Day gauges.
- The Day gauge (DaySquare) is the one signature shape.
- Squircle corners everywhere, with a plain radius as the fallback.
- One type family: IBM Plex Sans in sizes from 12px to 17px, a 24px page title and one large number size; IBM Plex Mono only for code to copy.
- Springs that settle quickly, a short overshoot when a value rises, and fades under reduced motion.

## Colors

Grey ink with a faint violet cast (hue 286) on white or black, plus sixteen muted habit hues that appear only as data.

Every color is OKLCH. The light theme is the default in CSS. The dark theme replaces the same custom properties inside `@media (prefers-color-scheme: dark)`, so a `-dark` token in the frontmatter is the dark value of the token with the same name. Tailwind gets the neutrals as colors (`bg-ground`, `text-ink-3`, `bg-surface-2` and so on); `dark:` is the media query, not a class.

### Primary

- **The habit palette** (`habit-rose` to `habit-stone`, 16 hues): the color of each habit, chosen from a fixed set. The hues are rose, apricot, ochre, sand, mustard, olive, green, jade, teal, sky, blue, slate, violet, mauve, raspberry and stone. The dark values are the owner's muted palette. The light values keep the same hue and chroma at a lightness of about 0.64, so a full square has 3.3:1 against white and the intensity steps stay clear. An element puts a habit's color in scope as `--c` (`habitColorStyle(color)`); then the gauge, the icon, and Tailwind's `text-habit`, `bg-habit` and `border-habit` read it.
- **Frame mix** (`--frame-mix`: 40% light, 35% dark): how much of the habit color the frame of a partial or zero Day takes, mixed with transparent. The light theme needs more, because a 35% frame is too faint on white.

### Neutral

- **Pure Ground** (`ground`): the page, the sticky day header behind its dates, and the text on a full square. White in the light theme, pure black in the dark theme.
- **Ink** (`ink`): primary text, sheet titles, today in the day header, a habit name under the pointer, the caret, and the light theme's toast capsule.
- **Dimmed Ink** (`ink-2`): habit names at rest and option labels at rest. Slightly dimmed, so the gauges lead.
- **Quiet Ink** (`ink-3`): the day header, sheet descriptions, captions, placeholders, the close icon, and the focus ring.
- **Faint Ink** (`ink-4`): disabled controls, and the focus ring of a text field. All four inks meet WCAG AA on the ground.
- **Line** (`line`): the frame of an empty Day and the dashed ghost gauge. Never a divider.
- **Strong Line** (`line-strong`): an empty frame under the pointer, the sheet handle, and the scrollbar thumb.
- **Surface** (`surface`): sheets, dialogs, popovers, and a row lifted for a reorder. In the light theme it is white like the ground and a shadow lifts it; in the dark theme it is a lighter grey, and the lightness is the elevation.
- **Surface 2** (`surface-2`): the rest fill of a control inside a sheet and of the "New habit" button, a checked option, the close button's disc, and the skeleton shapes of the habit page.
- **Surface 3** (`surface-3`): the hover and press fill of a control inside a sheet, the close button's disc included.
- **Tile** (`tile`): an empty Day on the habit page, which has no frame. A partial Day of the calendar fills over 24% of the habit color mixed into the tile (in oklab, so the tint keeps the habit's hue); a Day of the year grid is the habit color mixed into the tile, from 25% to solid.
- **Field** (`field`): a text field inside a sheet. In the light theme it equals `surface-2`. In the dark theme it is a well of pure black, so the placeholder keeps its contrast.
- **Backdrop** (`backdrop`): the scrim under a sheet or a dialog. 20% black in the light theme, 60% in the dark theme.
- **Toast and Toast Ink** (`toast`, `toast-ink`): the toast capsule. The light theme inverts it (an ink capsule with light text), so an Undo is never missed on white. The dark theme uses the surface grey with light text.

shadcn/ui's variables map onto these tokens: `background` is `ground`, `foreground` is `ink`, `card` and `popover` are `surface`, `primary` is `ink` on `ground`, `secondary`, `muted` and `accent` are `surface-2`, `muted-foreground` is `ink-3`, `border` is `line`, `input` is `line-strong`, `ring` is `ink-3`, and `destructive` is `habit-rose`. A shadcn component wears the world without changes.

### Named Rules

**The Data-Only Color Rule.** Habit hue appears only on what belongs to a habit: its icon, its Day gauges, and the ring of the Day under edit. Text, controls, focus rings and overlays use ink and surface tones. The one exception is shadcn's `destructive`, which borrows rose.

**The One Hue, Two Lightnesses Rule.** A habit color keeps its hue and chroma in both themes. Only the lightness moves: darker on white for contrast, the owner's values on black.

**The Four Inks Rule.** Text uses `ink`, `ink-2`, `ink-3` and `ink-4`, from strongest to quietest. Do not add a fifth grey for text.

## Typography

**Display Font:** IBM Plex Sans Variable (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** IBM Plex Sans Variable (the same stack)

**Character:** One sans with a slightly engineered tone. It stays legible at 12px, and its tabular figures keep columns of numbers even.

### Hierarchy

- **Display** (600, 2.25rem, 2.75rem line, -0.02em, tabular figures): the typed value in the number input, centered. It steps down to 1.75rem at 7 characters and to 1.375rem at 10, so a long value never runs under the buttons.
- **Title** (600, 1.0625rem, 1.375rem line, -0.01em): habit names in the list (in `ink-2`) and sheet titles (in `ink`). One line, with an ellipsis.
- **Page title** (600, 1.5rem, 1.875rem line, -0.02em): the name of a habit on its page, and the title of a screen before the list ("Habit", "No access"), in `ink`. It wraps.
- **Body** (400, 1rem, 1.25rem line): the dates in the day header (with tabular figures and -0.01em), option labels (at 500), and text fields (with a 1.375rem line).
- **Control** (600, 0.9375rem, -0.01em): buttons inside sheets and the toast action. The toast message uses the same size at 500.
- **Description** (400, 0.875rem, 1.25rem line): the line under a sheet title, such as "Today" or "Yesterday". In `ink-3`.
- **Caption** (400, 0.8125rem, 1rem line): the target or the unit under the number field. In `ink-3`, up to two lines.
- **Label** (500, 0.75rem, 0.9375rem line): the weekday letter over each date in the day header.
- **Code** (IBM Plex Mono, 400, 0.9375rem, 1.5rem line): a value to copy, such as the user id and the command on the "no access" screen, in `ink`. It breaks between words; a list of ids may break after a comma, and only a word wider than the column breaks inside.

On a phone these are 12, 13, 14, 15, 16, 17, 24 and 36px. The desktop's 20px base scales all of them by 1.25. The stepper buttons use 1.0625rem at 600 with tabular figures. A field never shows text under 16px (`font-size: max(16px, 1rem)`), because iOS zooms into a smaller field and does not zoom back.

### Named Rules

**The One Family Rule.** IBM Plex Sans is the only typeface for words. IBM Plex Mono, the mono of the same family, sets code to copy and nothing else; the browser loads it only on a screen that shows code. Hierarchy comes from weight (400, 500, 600, 700) and from the ink step, not from a second family or a large jump in size.

**The Today Is Bold Rule.** Weight 700 marks today and nothing else.

**The Tabular Numbers Rule.** A number that sits in a column or changes in place (the dates in the header, the stepper, the number field) uses tabular figures.

## Layout

The phone layout is the layout. A desktop gets the same layout with more room.

- **Breakpoints.** Wide is 640px and more (`min-width: 40rem`). Narrow is 359px and less (`max-width: 22.4375rem`).
- **Wide.** The root font size becomes 125% (20px), so every rem in the app scales by 1.25. The list shows 7 Days instead of 5. Forms open as dialogs and popovers instead of bottom sheets. The content sits in a centered column of 600px. The column is in px, so it does not scale.
- **The page beside the list (wide).** The page of a habit opens to the right of the list (`features/screens/`), and the two sit together in the middle of the window. The window does not scroll: the list and the page are columns of the window's height, each with its own scroll, and each reaches its edge of the window, so a wheel over the margin scrolls the column next to it. The page's column is at most 600px. The list takes what is left, in three steps: the whole list with its Days and 2.5rem before the page (1200px and more), the icons and the names in 15rem (880px and more), and the icons alone (640px and more). The rows keep their place in each step; the day header keeps its height without its dates. The open habit's row has a fill of 6% `ink`, which keeps the ring of an empty Day visible in both themes (0.75rem squircle, 0.25rem in from the row and 0.625rem in from the edges; a 2.375rem square around the icon when only icons show), and its name is `ink`. With only icons, "New habit" is a 2.375rem square with its plus. A row picked while a page is open replaces that page in the history, so Back returns to the list.
- **The row.** The icon and the name are at the left; the Days are at the right, with today at the far right. A row is `row` tall (54px on a phone) and has a `gutter` on each side. The name takes the remaining width and truncates.
- **The Day columns.** Each column is a square plus a gap wide, so the gap is part of the touch target. The half gaps at the ends hang outside, so the last square meets the gutter. The day header uses the same columns, so each date sits over its squares.
- **Narrow.** At 320px the gutter is 1rem, the squares are 1.75rem and the gap is 0.3125rem, so a name keeps room next to five Days.
- **The day header** is sticky at the top, on the ground color. Its top padding is the safe-area inset plus 0.375rem on a phone, and plus 1.5rem on a desktop, which has no status bar. There is no visible page title; a hidden `h1` names the page for screen readers.
- **The bottom** of a scrolling page has 6rem plus the safe-area inset of padding, so the toast never covers the last row.
- **Rhythm.** 0.75rem is the common gap: icon to name, between controls in a sheet, inside an option. 0.5rem is the tight gap: between the buttons in a row, and the inset of a floating sheet. 1.25rem is the side padding of a sheet, the same as the gutter.
- **Touch targets** are about 44px (`touch`, 2.75rem), also where the visible mark is smaller. The close button is a 44px target around a 28px disc. A Day cell is a square plus a gap wide and a full row tall.
- **Safe areas.** The page uses `viewport-fit=cover`. The day header, the bottom sheet, the toast and the bottom padding add `env(safe-area-inset-*)`. A bottom sheet is at most the screen less 3rem and both insets. The body pads the left and right insets, so a phone on its side keeps the content clear of the notch.
- **Units.** Measures are in rem, so the desktop base scales them. The list's measures are custom properties (`--gutter`, `--row`, `--icon`, `--square`, `--square-gap`).

## Elevation & Depth

Flat by default. Nothing on the ground is raised at rest. Depth appears only for overlays (a sheet, a dialog, a popover) and for a row lifted for a reorder. The two themes do this differently. In the light theme a soft two-layer shadow lifts a white surface off the white ground. In the dark theme a lighter grey surface is the elevation, with a hairline ring of 4% white, because a shadow does not show on black. A scrim (`backdrop`) dims the page under a sheet or a dialog. The toast has no shadow in either theme; its contrast with the ground is enough.

### Shadow Vocabulary

- **Elevation, light** (`box-shadow: 0 0.5rem 2rem oklch(0 0 0 / 0.12), 0 0.0625rem 0.25rem oklch(0 0 0 / 0.06)`): sheets, dialogs, popovers and the lifted row. Use it through `var(--elevation)`.
- **Elevation, dark** (`box-shadow: 0 0 0 0.0625rem oklch(1 0 0 / 0.04)`): the same places in the dark theme, through the same `var(--elevation)`.
- **Gauge frame** (`box-shadow: inset 0 0 0 0.09375rem <frame color>`): not depth. The frame of a Day is an inset ring, so it never changes the size of the square.

Stacking: the scrim is at z-index 50, the Day under edit at 51, and the sheet at 52. The Day under edit stays bright above the scrim while its input is open.

### Named Rules

**The Flat Ground Rule.** Nothing that sits on the ground has a drop shadow. A shadow means "this is above the page": an overlay, or a row in the hand.

**The Lighter Is Higher Rule.** In the dark theme, elevation is a lighter surface, not a shadow.

## Shapes

Squircles. Every rounded corner uses `corner-shape: squircle` with a plain `border-radius` as the fallback. A superellipse looks tighter than a circle arc of the same radius, so where the browser supports `corner-shape`, the radius grows by 1.75. Two tools do this: the `squircle-*` Tailwind utility (its value is the fallback radius), and `calc(<radius> * var(--squircle-k))` in component CSS, where `--squircle-k` is 1 or 1.75.

Pills (the toast and its action) use an infinite radius with `corner-shape: superellipse(1.5)` (the `squircle-full` utility). Small round parts (the close disc, the sheet handle, the habit page's skeleton name bar) use a plain 999px radius.

The radius scale, as fallback values: the gauge is 19% of its side, an icon tile 18% of its side, a control 0.625rem, a lifted row 0.75rem, a stepper and a popover 0.875rem, a dialog 1rem, a bottom sheet 1.25rem. Larger containers get larger radii.

There are no structural borders. A frame is an inset ring: 1.5px (0.09375rem) by default, thinner for small gauges through `--ds-frame`. The habit page draws its gauges without a frame: the calendar fills its Days (`look="fill"`) and the year grid colors them flat (`look="flat"`); an empty Day is a `tile`. A calendar Day has a notch at its top left that holds its date, a mask on the square, so the fill never runs under a digit. A dashed 1px border marks something that does not exist yet: the ghost gauge, in `line`.

### Named Rules

**The Squircle Rule.** No rounded corner without `corner-shape: squircle` and the 1.75 multiplier where it is supported. A hard-coded radius alone looks too tight in a browser that draws superellipses.

**The Dashed Means Not Yet Rule.** A dashed outline means "this does not exist yet", as in the ghost gauge on the page of a missing habit. Nothing else is dashed.

## Components

Components are quiet at rest and precise in motion. Controls inside sheets are neutral tonal fills; nothing is filled with an accent color.

### Day gauge (DaySquare)

The signature component: the gauge of one Day, used for every Day on every screen. Import `DaySquare` from `@/components/day-square`. It is only the picture; wrap it in your own button.

- **Shape:** a square of `--ds-size` (default `square`, 30px on a phone), with a squircle radius of 19% of the side. `overflow: hidden` clips the fill to the corners.
- **Frame:** an inset ring of 1.5px in the habit color at `--frame-mix`.
- **Fill:** a layer of solid `--c` that scales up from the bottom to the intensity (0 to 1, `scaleY`).
- **Label (optional):** centered, at 50% of the side, in the habit color; in the ground color on a full square.

| State | When | Look |
| --- | --- | --- |
| empty | no Entry | a frame in `line`, no fill; `line-strong` under a fine pointer |
| zero | an Entry of 0 (such as 0 cigarettes) | a frame in the habit color at `--frame-mix`, no fill |
| partial | intensity between 0 and 1 | the habit frame, filled from the bottom to the intensity |
| full | intensity 1 | solid habit color |
| ghost | a habit that does not exist yet | a dashed 1px border in `line`, no frame, no fill |
| editing | the Day that an open input edits | a 2px outline in the habit color, 3px out, above the scrim |

Empty and zero are both "frame only", but they differ: a recorded zero is data and takes the habit color. Empty and filled differ in shape, not only in color. Mark the Day under edit with `data-editing`, and give it `data-entry={entryRef(habitId, day)}` so the desktop popover can anchor to it. A Day after today has no gauge at all; the calendar shows its date alone.

- **Looks:** `frame` (the default, in the list), `fill` (no frame, an empty Day is a `tile` and a partial one fills over a tint of the habit color; the calendar) and `flat` (no fill: the square is the habit color mixed into the `tile`, from 25% for the lightest Day to solid; a recorded zero is a `tile` with a 1px ring in the habit color at `--frame-mix`; the year grid).

- **Motion, rise:** the fill moves with the fill spring (a CSS transition on `transform` with `--spring-fill`), so a fast series of taps retargets instead of restarting. The square pulses: a physical spring from scale 1 with a start velocity, peaking at about 1.04.
- **Motion, fall:** the fill drains in 200ms with `--ease-out`. No pulse.
- **Reduced motion:** the fill changes in place and fades from 35% to full opacity in 180ms.
- **Large grids:** set `animated={false}`.

### Day cell (the button around a gauge)

- **Size:** a square plus a gap wide and a full row tall, so the touch target is about 44px.
- **Press:** the gauge scales to 0.95 in 120ms. On touch the pressed look waits 60ms, so a scroll that starts on a square does not dip it.
- **Hold:** on a number habit, a held square shrinks to 0.9 over 450ms, linearly, as the progress toward the input. A release returns it in 120ms with `--ease-out`.
- **Focus:** the global 2px `ink-3` outline, inset by 0.25rem.
- **Scroll:** the row of cells allows `pan-y`, so a vertical drag stays a scroll.

### Habit icon

- **Style:** a Phosphor icon in the duotone weight, drawn in the habit color with no tile behind it. The duotone's 20% layer is its soft tint. An emoji is the alternative, at 90% of the box.
- **Size:** `icon` (22px on a phone) in the list; 1.25rem next to a sheet title.
- **Loading:** a Phosphor icon loads on first use; the box keeps its size, so the row does not move, and an icon that comes after its row fades in over 160ms with `--ease-out`. At start the app waits for the icons of the first screen (`loadHabitIcons`), so they draw in the list's first frame.

### Habit row

- **Structure:** the head (icon, then the name 0.75rem after it) at the left, the Day cells at the right. No background, no border, no divider.
- **Name:** Title type in `ink-2`; `ink` under a fine pointer (120ms).
- **Lifted for a reorder:** the row scales to 1.02, takes a `surface` background with a 0.75rem squircle radius and `var(--elevation)`, and the name turns `ink`. The neighbors move aside in 200ms with `--ease-out`. Under reduced motion the lift has no scale and the neighbors move at once.
- **"New habit" button:** under the last row, as wide as the rows between the gutters and 3rem high. A `surface-2` fill with a 0.75rem squircle radius, a bold Phosphor plus and "New habit" centered in Control type, in `ink-2`. Under a fine pointer the fill turns `surface-3` and the text `ink`. A press scales it to 0.98. It is the one control with a fill on the bare ground, so the way to a first habit is never missed.
- **A new habit enters:** after "Add habit", its row grows at its place from no height with the morph spring, 120ms after the press, while the sheet leaves; the rows under it and "New habit" move down with it, and its content comes down 0.75rem and fades in over 240ms. Only a habit made in the last 3 seconds enters: the first load, the snapshot's change to the live data and the Undo of a delete never animate. Under reduced motion nothing moves, and the row fades in over 180ms.

### Day header

- **Style:** the weekday letter (Label type) over the date (Body type, tabular), in `ink-3`, centered over each Day column.
- **Today:** `ink`, both lines at 700.
- **Position:** sticky at the top on the ground color, aligned to the right over the gauges.

### Sheets, dialogs and popovers (ResponsiveSheet)

One component for every form and input: `ResponsiveSheet` from `@/components/sheet`. It is a bottom sheet on a phone, and on a desktop a centered dialog or a popover at an element.

- **Bottom sheet (phone):** `surface`, a 1.25rem squircle radius, at most 30rem wide. It floats 0.5rem above the bottom edge and the home indicator. In the installed app it sits 0.5rem from the screen's bottom edge, over the home indicator, with its content padded clear of it, and its bottom corners are concentric with the display's: the display's radius less 0.5rem (a table by screen size, `components/sheet-viewport.ts`). With a software keyboard up it sits 0.5rem above the keyboard, at most as tall as the visible part of the screen less 1rem, and its content scrolls inside it. A handle (2.25rem by 0.3125rem, `line-strong`, pill) floats 0.5rem from the top, out of the flow, so the header sits where it does in a dialog. A swipe down dismisses it. It enters with the sheet spring on `translateY`, and leaves in 400ms times the swipe strength with `--ease-drawer`. The scrim fades in 400ms with `--ease-drawer` and follows the swipe. It reaches the browser's bars too: the installed app's status bar takes the scrim through `theme-color`, and Safari's bars through two hidden bands at the top and the bottom edge (`docs/notes/web-sheet.md`).
- **Dialog (desktop):** `surface`, a 1rem squircle radius, 22rem wide, centered. It enters and leaves with a fade and a scale from 0.96 in 200ms with `--ease-out`.
- **Popover (desktop):** `surface`, a 0.875rem squircle radius, 17rem wide, 10px below its anchor, 16px from the window edges. It scales from 0.96 at the anchor side with a fade in 180ms.
- **Header:** the close button's disc sits 1.25rem from the top and from the side, as far as the content is from the edge, in all three forms. The title (Title type; an entry input puts the habit icon at 1.25rem before it) is centered on the disc, and an optional description in `ink-3` goes under the title. The close button is a 44px target around a 28px `surface-2` disc, with a bold Phosphor X in `ink-3`. Under a fine pointer and while pressed the disc turns `surface-3` and the X `ink`, as the other buttons of a sheet do; a press scales it to 0.96.
- **Body:** 0.75rem top padding, 1.25rem on the sides and the bottom.
- **Height:** the content morphs its height with the morph spring, so a sheet grows and shrinks between steps instead of jumping.
- **Footer:** the buttons that end a sheet (`footer`) sit under the content, outside the part whose height morphs. On a phone they stay where they are while a step or a field above them changes; in a dialog they move with its bottom edge. While a long step scrolls they stick to the bottom, and what passes under them is cut at the top edge of the button, with no fade. The body's bottom padding is the gap above them at the end of the scroll.
- **Reduced motion:** a 180ms fade replaces the slide and the scale; a swipe still follows the finger; the height changes at once.
- **No save button:** each change applies at once.

### Buttons

- **Shape:** a 0.625rem squircle radius; 2.75rem tall.
- **Default:** `surface-2` fill, `ink` text, Control type, 0 1rem padding. An optional icon sits 0.375rem from the label.
- **Hover / Press:** `surface-3` fill under a fine pointer and while pressed; a press scales to 0.97 in 120ms.
- **Disabled:** `ink-4` text at 60% opacity.
- **Destructive:** "Delete habit". 12% of `destructive` mixed into `surface` (18% under a fine pointer and while pressed), and the text 70% `destructive` mixed with `ink`, so it keeps its contrast in both themes.
- **Focus:** the global focus ring, 2px solid `ink-3`, 2px out.
- **Stepper:** the −Step and +Step buttons of a number input. At least 3.5rem square, a 0.875rem squircle radius, `surface-2`, 1.0625rem at 600 with tabular figures. A press scales to 0.95 on `surface-3`.

### Inputs / Fields

- **Number field:** Display type in `ink`, centered, transparent, with no border and no outline. The placeholder is `ink-3`. A caption in `ink-3` sits under it. The field applies a typed value after a 700ms pause, on Enter, and on blur.
- **Text field:** a `field` fill, `ink` text, a 0.625rem squircle radius, 0.75rem by 0.875rem padding. At least 5.5rem tall; it grows with its content (`field-sizing: content`) up to 40% of the viewport height. No resize handle.
- **Focus:** a text field shows an inset 1.5px ring in `ink-4`. Other controls use the global focus ring.

### Option list

The Options of a choice or a scale Day, as a radio list.

- **Option:** at least 2.875rem tall, 0.5rem by 0.75rem padding, a 0.625rem squircle radius, Body type at 500 in `ink-2`. The label wraps to two lines, then ends with an ellipsis.
- **Leading mark:** a choice shows its emoji in a 1.25rem box. A scale shows a 1.25rem gauge at the Option's level, from the lightest to full.
- **Checked:** `surface-2` fill, `ink` text, and a bold Phosphor check at the end that fades in and grows from 0.9 in 160ms.
- **Hover / Press:** `surface-2` under a fine pointer; a press scales to 0.985.
- **After a pick:** the sheet stays open for 220ms, so the check is seen, then closes.

### Toast capsule

- **Shape:** a pill (infinite radius, `superellipse(1.5)`), 2.875rem tall, as wide as its content up to the window width less 2rem.
- **Color:** `toast` fill with `toast-ink` text. No shadow.
- **Content:** the message (0.9375rem at 500, one line with an ellipsis), then the action 1.25rem after it. Padding is 0 0.5rem 0 1.375rem with an action, and 1.375rem on both sides without one.
- **Action:** a pill 2.25rem tall, Control type. Under a fine pointer it takes 8% of `toast-ink`; while pressed, 12% and a scale of 0.96.
- **Position:** bottom center, 1.5rem from the bottom on a desktop and the safe-area inset plus 1rem on a phone. At most three are visible, 8px apart.
- **Timing:** a plain message stays 4s, an Undo 6s, and "Couldn't save" with Retry 8s. Only one save error shows at a time.
- **Reduced motion:** a 180ms fade.

### Habit form (create and edit)

The create sheet (`?new=true`) and the edit sheet (`?edit=<id>`), in `features/habit-form/`. On a desktop the dialog is 25rem wide, not 22rem, so 8 color swatches and the Option rows have room.

- **Two columns (960px and more):** the dialog is 44.5rem wide, with two columns of 20rem, 2rem apart: what the habit looks like (the icon and the name, the description, the color) at the left, and how it is tracked (the Direction, the Kind and its fields) at the right. So the form fits a 1280×800 window without a scroll. The footer button runs under both columns, and so does "Delete habit" in the edit sheet. A picker unfolds in its own column, with the search over the Icons or Emoji tabs. A narrower window keeps one column.
- **Steps:** create is one step: the icon and the name, the description, the color, the Direction and the Kind, and under them the fields of a number, choice or scale habit. When the Kind changes, its fields move as the steps do: the new ones come in from the side where the new Kind lies in the segmented control, and the old ones leave to the other side; a Kind without fields only lets the old ones leave. Under reduced motion they crossfade. A choice and a scale share their Options, so between them the rows stay: what a scale adds moves instead (see Options). The pickers are not steps (see Icon picker).
- **Icon tile:** before the name, as tall as the name field: 3.25rem, a 0.625rem squircle, the habit icon at 1.75rem on 16% of the habit color mixed into `surface` (in OKLab: an OKLCH mix turns the tint pink on white). The tint rises from the bottom like a Day, with the fill spring and the gauge's pulse, when the create sheet opens (after 220ms, so the sheet has come up) and when the color changes. A new icon crossfades from 0.9 with a 2px blur.
- **Fields:** the field fill, a 0.625rem squircle, 3rem tall (the name and the description 3.25rem, as tall as the icon tile; the name at Title type), 0.875rem side padding, the `ink-4` inset ring on focus. A label above a field is 0.875rem at 500 in `ink-3`. The color, the Kind and the Direction have no visible label: their content says what they are, and a screen reader still reads one.
- **Segmented control:** a radio group on a `surface-2` track with a 0.125rem inset; the chosen segment gets a pill (`surface`, `surface-3` in the dark theme) that slides with the lift spring. The Kind segments put a bold Phosphor icon over a Caption label. The Direction segments put the label over a short line in `ink-3` that says what it means ("Do more", "Do less"), so both controls are 3.5rem tall.
- **Color swatches:** the 16 colors, 8 on a row, each a 72% squircle in its cell. The chosen one gets a 4px ring of its color at 50%, with no gap, and a bold check in `ground`.
- **Primary button:** one per step, the action that ends it ("Add habit"): `ink` fill, `ground` text, full width, otherwise the default button.
- **Footer button:** the create sheet has one button in its footer, "Add habit", so it never moves. (In the lab's "Step" place of the pickers it becomes the quiet "Back" under a picker.) Its fill and text color change in 200ms. Its label rolls: going to a picker, the old label leaves 12px upward and the new one comes from 12px below; going back, the other way round. The label that leaves fades in 140ms with a 2px blur; the new one comes in with the morph spring and a 220ms fade. Under reduced motion the label crossfades.
- **Sticky footer:** in the edit sheet, a button at the end of a step ("Back" under a picker in the lab's "Step" place) sticks to the bottom of the sheet while a long step scrolls; what passes under it is cut at the top edge of the button, with no fade. (`MorphHeight` clips with `overflow: clip`, which is not a scroll container, so `position: sticky` works inside it.)
- **Messages:** a calm line under its field, 0.875rem in `ink-2`, no red, no shake. It opens with the morph spring and fades in.
- **Options:** a row per Option: a gauge at the Option's level (scale only), a 3rem emoji button on the field fill (a quiet smiley while it has none), the label field, a remove button and a drag handle. Rows enter and leave with the morph spring on their height and a fade (a removal fades in 120ms). When a choice turns into a scale, each row's gauge opens its room with the morph spring, 40ms after the row above, and its fill rises to the level with the gauge's pulse; the label above rolls to "Options, from the lightest to the fullest" as the footer button's label does. Back to a choice, the gauges fold away. Under reduced motion, fades. A dragged row lifts onto `surface` with the elevation. Retired Options wait under the list, struck through in `ink-3`, with Restore.
- **Taps preview:** under the number fields, up to five 1.25rem gauges show the fill of each tap, and a line counts the taps that fill the day ("reach the limit" for a quit habit).
- **Icon picker:** a tap on the icon tile unfolds the picker in place, under the name and before the description; a tap on an Option's emoji unfolds it under that row. The rest of the form stays and moves down with the morph spring; the picker comes 0.5rem down with a 2px blur and a fade. The button that opened it gets the 4px ring of the habit color at 50%, as a chosen swatch. A pick, a second tap on the button, or Escape folds it away, and the focus returns to the button. Once open, the picker scrolls into the sheet's view, clear of the footer. It holds a search field (an emoji typed there can be used as it is), Icons or Emoji, and a grid of 2.75rem cells in an area of `min(14.5rem, 34dvh)` that scrolls, with 1rem of space at the end. (The lab's `icon-picker-place` also has a stacked sheet, a popover and the old step with a zoom; see `docs/notes/web-habit-form.md`.) The chosen cell takes 18% of the habit color and a ring at 70%. For an Option it offers emoji only, with "No emoji" (a Prohibit sign in `ink-3`) as the first cell.

### Habit page

The page of one habit (`/habits/$habitId`), in `features/habit-page/`.

- **Bottom buttons:** back (4.5rem wide, with a bold Phosphor caret), then "Edit" (a bold pencil and the label) in the rest of the row, 0.5rem apart, fixed 0.75rem above the bottom safe area in the page's column. They look like the "New habit" button: `surface-2`, a 0.75rem squircle, 3rem tall, Control type in `ink-2`, and `surface-3` with `ink` under a fine pointer. Back presses to 0.96, Edit to 0.98. They stand on a band of `ground` with a 1rem fade above it, so the page scrolls out under them and never shows its tiles around them. On this page the toasts rise 3.25rem, above them.
- **Title:** the habit icon at 1.75rem and the name at 1.375rem with a 1.75rem line, 600, `ink`, -0.02em, 0.75rem apart, the icon on the first line, 0.75rem under the top safe area on a phone (close under the status bar, as the list's day header is) and 1.5rem from the top on a desktop. The name wraps (it is the page's `h1`). The description sits under the name in `ink-3` at 0.9375rem. The year grid starts 1.25rem under the title. On a desktop, where the page changes to another habit in place, a habit with no description keeps the room of its line, so the grid and the calendar start at the same height on each page; only a name or a description that wraps pushes them down. A phone shows one page at a time and gives that room to the Days.
- **Year grid:** 52 Monday weeks of flat `DaySquare`s (`look="flat"`) that end with the week of today, in squares of 0.875rem with a 0.1875rem gap; the grid does not animate. It scrolls sideways from edge to edge of the column, with no fade at its edges, and opens at today, where it ends at the gutter. When the calendar moves to a Month of the grid, the grid scrolls it into view. Each Month is a button over its columns: its short name (Label size in `ink-3`; the shown Month in `ink` at 600) and its squares. Under a fine pointer a Month takes 6% of `ink`.
- **Calendar:** the weekday letters, then the Days in 7 columns, one row for each week of the Month, then the controls right under the last row, near the thumb: the name of the Month as plain text (0.9375rem at 600 in `ink`, with a bold caret in `ink-3`; it opens the picker), "Today" (only when another Month shows) and two carets. The first and the last square meet the gutters: the room between the squares is shared out evenly, each column is a square and a gap wide, and each weekday letter stands over the middle of its square.
- **The controls** share one look: plain at rest, and a 0.625rem squircle of 6% `ink`, with the text in `ink`, under a fine pointer and while pressed; a disabled caret takes neither. The name of the Month presses to 0.97, "Today" and the carets to 0.96. The fill of the name starts on the left gutter and the fill of the last caret ends on the right one, as Back and Edit do, so the name's text sits 0.625rem in. A Day is a gauge of up to 3rem, never wider than its column less 0.5rem, with a notch at its top left (47.5% of the side wide, 37.5% high, its corners rounded) that holds the date: 27% of the side, at 600, tabular, `ink-2`. Today has its date in `ink` at 750, and no ring. A Day after today has no square, only its date in `ink-4` at 50%. A choice shows its emoji in the middle of what the notch leaves. The Day under edit gets its ring on a box around the square, since the mask of the notch would cut a ring on the square itself.
- **Height:** the calendar is as tall as the weeks of its Month. Between two Months with different counts of weeks, the height follows the track: it moves with the finger and settles with the same spring. A change from the keyboard, or under reduced motion, changes it at once.
- **Month picker:** `?monthPicker=true`, a bottom sheet on a phone and a popover at the name of the Month on a desktop, with the shown Month as its title. Two columns, 2fr and 1fr: the months of a year two to a row, by their short names (Jan to Dec), and the years beside them, the newest at the bottom, level with the last row of months; older years scroll up, and the top edge fades while there are more. The years go back to the habit's creation, and at least two years before this one. Each cell is 2.75rem tall, 0.9375rem at 500 in `ink-2`, with a 0.625rem squircle; the shown Month and the chosen year take `surface-2` and `ink` at 600; a month after this one is `ink-4` at 45% and does not take a tap. Under a fine pointer and while pressed a cell takes `surface-3`; a press scales it to 0.97. A year changes the months on show and keeps the picker open; a month moves the calendar there and closes the picker.
- **Two ways to another Month, in the lab for now:** the lab's "Month picker" choice (`month-picker`) switches between the zoom below ("Zoom out", the default and what a production build gets) and the picker above ("Sheet"). Both stay in the code while the zoom is still being tuned.
- **Zoom out to the months:** with "Zoom out", the name of the Month zooms the calendar out in place, with no sheet and no overlay, on a phone and on a desktop alike, and no URL. In place of the Days come the 12 months of the Month's year, four to a row with a 0.875rem gap: each a button with its short name (0.8125rem at 500 in `ink-2`, at the left) over a small calendar of flat squares (the year grid's look, a 0.125rem gap, 7 columns, 6 rows kept, Monday first). A small calendar is as wide as its column, so its squares grow with the screen (about 0.625rem on a 402px phone), and the first and the last of a row meet the gutters, as the Days and the grid above do. The open Month has no fill: only its name, in `ink` at 600, tells it; a month after this one has a faint name, no squares, and takes no tap; under a fine pointer a month, the open one too, takes 6% of `ink` (a 0.75rem squircle), and a press scales it to 0.97. The label reads the year; the arrows, a horizontal swipe and a trackpad swipe flip the year, within the picker's range of years; "Today" hides. A tap on a month zooms into its Days at once, without the slide of the paging. The label, or Escape, zooms back into the open Month when the year on show has it, else into the same month of that year, never past this one.
- **The zoom's motion:** on the morph spring, from `morphTiming`. Out: the Days scale uniformly from their top left onto the open Month's small calendar, their first and last squares onto its first and last, and fade between 30% and 70% of the motion; that month's name and squares fade in from 45%; the other months fade in and grow from 0.9, the nearest first (0.6 of the motion, after 18% plus 4.5% for each step away); the weekday letters fade in the first quarter; the label crossfades; the height of the calendar follows. In: the same in reverse onto the tapped month's full calendar. A flip of the year brings the months in from 1.5rem on its side. The calendar takes no input while a zoom runs. Focus goes to the open Month on the way out, and back to the Day that had it (or the label) on the way in. Under reduced motion the two levels crossfade in 180ms.
- **Paging:** the track follows the finger 1:1 with a rubber band at the current Month, and settles with the sheet spring and the finger's speed. A flick (above 0.11 px/ms on average over 16px, still moving at the lift) turns the page. A horizontal trackpad swipe moves the track the same way and settles when the steps of its events start to shrink (the momentum after the lift); a mouse wheel's notch turns one page. A change from the keyboard is instant. Under reduced motion a new page fades in.
- **Hold:** a Day presses to 0.95 in 120ms; a hold adds a linear shrink on `scale`, to 0.9 in all, over the time to the paint (200ms) or the input (450ms).
- **From the list and back (phone):** a push, as in a native app (a view transition, `features/screens/screen-transition.ts`). The page slides in from the right over the list, and the list moves 30% of its width to the left and dims (`brightness` 0.9 in the light theme, 0.6 in the dark). Both move in 420ms on `--ease-drawer`, so no gap opens between them. Back plays the reverse with the page on top, from the Back button and from the browser's back and forward, unless the browser animates the change itself (the back swipe on iOS, `hasUAVisualTransition`). A finger that lands during it ends it, and its tap goes to the screen under it. Under reduced motion the screens crossfade in 180ms. A browser without view transition types crossfades in 200ms.
- **Beside the list (wide):** the list moves aside with the sheet spring and keeps its left edge: its column narrows to the next step, which cuts off what it drops, while its old and new pictures cross in 240ms. The page comes from the right with it, from as far as the list moves plus 1.5rem, and fades in over 300ms. Back plays it in reverse, the page fading in 200ms. Another habit crossfades the pages in 200ms. The title does not move. Under reduced motion nothing moves, and the page fades in 180ms.
- **Under edit, on a phone:** the page rises with the sheet spring until the Day is 16px above the input sheet, and comes back when the sheet closes.
- **Empty state:** a ghost gauge, "This habit is not here" (Title type), a line in `ink-3`, and a "Back to habits" button.

### Before the list: loading, sign-in, no access

The screens of `features/auth/`. `AuthGate` in the root route shows the app to the owner only, and gives each other state of the sign-in its own screen. They share one frame: a column of at most 24rem, the mark at `max(4rem, 26dvh)` below the safe area, a page title 1.5rem under it, and the content 2.5rem under the title.

- **The mark:** five `DaySquare`s of 2.125rem in a row, with the gauge gap, in sky, green, ochre, violet and rose. It is the only color on these screens.
- **Loading:** the bare ground, so a fast start goes straight to its screen. After 1s the empty mark fades in (400ms, `--ease-out`) at the place where the sign-in screen draws it. For the owner it stays until the habits are there (the snapshot or the live data) and the icons of the first screen have loaded (2s at most), then fades out over the complete list in 400ms with `--ease-out`, the mark with it. The list never builds up in steps, so it has no skeleton.
- **Sign-in:** centered. The mark fills one square after the other (70ms apart) with the gauge's spring and pulse, then the title "Habit" and one primary button, "Continue with Google" (a bold Phosphor Google logo, 0.375rem before the label). While Google opens, the label says "Opening Google…". No other copy.
- **Email code (development, and the installed app):** "Sign in with an email code", a quiet text action in `ink-3` with a 44px target, opens two short steps under the button, with the morph spring: the email field and "Send code", then the code field (tabular, centered, letter-spaced 0.2em) and "Sign in". Fields on the ground use `surface-2` in the light theme and `surface` in the dark theme. In development, a note in `ink-3` names the test users; "owner" and "guest" in it are underlined words that fill the field. The installed app (standalone display) shows the same two steps without the note, because Google's sign-in cannot return to an installed app on iOS. A message under a field is 0.875rem in `ink-2`.
- **No access:** the same frame, left-aligned in the 600px column, nearer the top (`max(3rem, 12dvh)`), and it fades in over 240ms. The mark stays empty: this account has no data. The title "No access", a plain paragraph, then the user id and the command, each with a label (0.875rem at 500, `ink-3`) and a "Copy" text action (a bold Phosphor copy icon; "Copied" with a check for 1.6s). The values are in the code type. The command breaks between its words, never inside one. "Sign out" is a quiet button.

### App icon

- **Drawing:** one Day gauge, two thirds full, in the dark theme's `habit-blue` on the dark theme's pure black ground: the gauge is the signature of the app, and black is the owner's theme. The gauge has its squircle corners and its frame (35% of the color), 53% of the side, inside the 80% safe circle of a maskable icon.
- **Files** (`apps/web/public/`, drawn by `scripts/icons.ts`, `vp -C apps/web run icons`): `apple-touch-icon.png` (180px, full bleed; iOS rounds it), `icon-maskable-*.png` (full bleed), `icon-*.png` ("any": a black squircle tile on transparent, for a desktop install), `icon.svg` and `favicon.ico` (the gauge alone).
- **Theme colors:** `theme-color` follows the scheme (white, black). The manifest takes one value, black, for both `theme_color` and `background_color`, the color of the icon's ground.

### Motion grammar

All motion comes from the presets in `@/components/motion`, after Family: springs that settle quickly, a short overshoot when a value rises, and sheets that change their height instead of cutting.

- **Springs (Motion):** fill (visual duration 0.38s, bounce 0.24), sheet (0.42s, bounce 0.1), morph (0.34s, bounce 0.12), and pulse (stiffness 600, damping 18, mass 1, start velocity 1.6, a peak of about 1.04). `installCssSprings()` puts the fill and sheet springs on the document as `--spring-fill` and `--spring-sheet` (`linear()` easings), so CSS and JS motion match. The sheet spring also comes in parts, `--spring-sheet-duration` and `--spring-sheet-easing`, for a view transition's group, whose animation has no author name.
- **Curves:** `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) for every plain transition; `--ease-drawer` (`cubic-bezier(0.32, 0.72, 0, 1)`) for the bottom sheet and its scrim.
- **Durations:** a press 120ms; a color change 120ms; a check mark or a frame 160ms; a popover 180ms; a dialog, a drain and a reorder 200ms; the sheet scrim 400ms.
- **Presses:** larger elements press less. A Day and a stepper press to 0.95, the close button and the toast action to 0.96, a button to 0.97, the "New habit" button to 0.98, an option to 0.985.
- **Reduced motion:** a fade replaces each movement (180ms with `--ease-out`). Components read `useReducedMotion()` and drop transforms. A swipe still follows the finger.

### Named Rules

**The Rise Pulses Rule.** A value that rises springs up and pulses to about 1.04. A value that falls drains in 200ms with no bounce.

**The One Grammar Rule.** Every screen uses the springs and durations in `components/motion.ts`. A new screen does not invent its own curve.

## Do's and Don'ts

### Do:
- **Do** put a habit's color in scope with `habitColorStyle(color)` (`--c`) and draw from it: the gauge, the icon, `text-habit`, `bg-habit`, `border-habit`.
- **Do** use `DaySquare` for every Day on every screen, in your own button with a touch target of about 44px. Set `animated={false}` for a large static grid and a thinner `--ds-frame` (0.0625rem) for a small square.
- **Do** round every corner with `corner-shape: squircle` and the 1.75 multiplier: the `squircle-*` utility, or `calc(<radius> * var(--squircle-k))`.
- **Do** write measures in rem, so the desktop's 20px base scales them, and keep the content in the 600px column.
- **Do** set text in the four inks: `ink` for primary text, `ink-2` for habit names, `ink-3` for secondary text and the day header, `ink-4` for disabled controls.
- **Do** open every form and input with `ResponsiveSheet`: a bottom sheet on a phone, a dialog or a popover at 640px and more.
- **Do** give every movement a reduced-motion fade of 180ms, and keep a swipe under the finger.
- **Do** use tabular figures for dates, steppers and number fields.
- **Do** check both themes: light is the default, dark comes from `prefers-color-scheme`.

### Don't:
- **Don't** put a habit on a card, a panel or a tile, and don't separate rows with lines or dividers. Space separates them.
- **Don't** use habit color for names, UI text, buttons, focus rings or overlays. It stays on the icon and the gauge.
- **Don't** give anything that sits on the ground a drop shadow, the toast included. Shadows are for overlays and the lifted row.
- **Don't** show a Day's state by color alone: an empty Day is a frame, a filled Day has a fill.
- **Don't** pulse or bounce on a fall. A drain is 200ms with `--ease-out`.
- **Don't** hard-code a radius without the squircle multiplier.
- **Don't** add a second type family (IBM Plex Mono is the family's own mono, for code to copy only), uppercase eyebrows or kickers, or letter-spaced labels.
- **Don't** set the text of a field under 16px.
- **Don't** style a quit habit differently from a build habit, and don't draw streaks, percentages or badges.
- **Don't** add a theme switch or a `.dark` class; the theme is the system setting.
