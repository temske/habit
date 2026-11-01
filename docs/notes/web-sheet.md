# Notes of the bottom sheet on the iPhone

`ResponsiveSheet` on a phone is Base UI's Drawer (`apps/web/src/components/sheet.tsx`). These
notes explain how it fits the iPhone's status bar, Safari's bars, the display's corners and the
software keyboard. Nothing here was checked on a real iPhone. The owner's checks are at the end.

## The status bar of the installed app

The installed app uses the status bar style `default` (`docs/notes/pwa.md`). The status bar is
then a band outside the page, and iOS colors it from `theme-color`. The scrim (`--backdrop`) cannot
reach it, so the band stayed white over a dimmed page.

While a bottom sheet is open, `components/theme-color.ts` sets each `theme-color` tag to its
color under the scrim: white under 20% black is `#cccccc`; black under 60% black stays black. The
color moves on the scrim's own timing, 260ms on `--ease-drawer` (the curve computed in JS), and
comes back when the sheet starts to close. When the scrim's fade changed to 260ms and the status
bar kept 400ms, the band above the page dimmed more slowly than the page: the owner saw the scrim
darken unevenly as a sheet came and went.

Not known: whether iOS 26 repaints the status bar of an installed app when `theme-color` changes
at run time. Safari 15 to 18 did for its own bars. Reports say that Safari 26 ignores
`theme-color` for its bars ([Ben Frain](https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/)).
None of them is about an installed app.

## Safari's bars

Safari 26 ignores `theme-color`. It colors the area of its top bar and its bottom bar from the
page. WebKit's source (`LocalFrameView::fixedContainerEdges`, `PageColorSampler`) shows how:

1. For each edge, it hit-tests one point: the middle of the edge, 4px in. It ignores
   `pointer-events`.
2. From the element it hits, it goes up to the first fixed or sticky element.
3. An element as wide as the page and less tall than the page (a header, a bottom bar) gives its
   `background-color`. A color with less than 75% alpha is blended over the page's background.
4. For an element as large as the page (a scrim, which WebKit calls a "dimming layer", or Base
   UI's full-screen `.sheet-viewport`), Safari keeps the color that the edge had before.

That is the bug the owner saw. On the list, the sticky day header made the top white; when a sheet
opened, the hit test found the full-screen `.sheet-viewport`, and Safari kept the white. On the
habit page there was no fixed element at the top, so Safari sampled the pixels (gray). At the
bottom it kept the white of the page's fixed bar (`.hp-actions`).

The fix: two bands (`.sheet-edge`), fixed at the top and the bottom edge, 1rem high and as wide as
the page, above the sheet's viewport. Their background is the scrim's color, so Safari blends
`#cccccc` (light) or black (dark). They are invisible: a `filter: opacity(0)`, because Safari skips
an element whose `opacity` is below 0.1, and it does not look at filters. Taps go through them
(`pointer-events: none`). They show only while the sheet is open, so the bars change back when the
sheet starts to close.

## The display's corners

CSS cannot read the display's corner radius. `displayCornerRadius()` looks it up by the screen's
size in points, with the values that the
[ScreenCorners](https://github.com/kylebshr/ScreenCorners) library reads from UIKit:

| Screen (pt) | Phones | Radius (pt) |
| --- | --- | --- |
| 375×812 | 12 mini, 13 mini (X, Xs, 11 Pro have 39) | 44 |
| 414×896 | Xr, 11 (Xs Max, 11 Pro Max have 39) | 41.5 |
| 390×844 | 12, 12 Pro, 13, 13 Pro, 14, 16e | 47.33 |
| 428×926 | 12 Pro Max, 13 Pro Max, 14 Plus | 53.33 |
| 393×852 | 14 Pro, 15, 15 Pro, 16 | 55 |
| 430×932 | 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus | 55 |
| 402×874 | 16 Pro, 17, 17 Pro | 62 |
| 420×912 | Air | 62 |
| 440×956 | 16 Pro Max, 17 Pro Max | 62 |

In the installed app, with the keyboard closed, on a screen of the table, the sheet sits 0.5rem
from the bottom edge, and the radius of all four corners is the display's radius less 0.5rem,
times `--squircle-k`. Its footer (or its body, without a footer) gets the home indicator's inset
less 0.5rem of extra bottom padding. Anywhere else (Safari, an unknown screen, a phone with
Display Zoom, which reports a smaller screen) the sheet floats above the home indicator, and all
four corners keep the normal 1.25rem.

The first version made only the bottom corners concentric, and the top ones kept 1.25rem. The
owner found that wrong ("rounding only at the bottom"). iOS 26 gives a floating sheet the same
radius on all four corners, so the sheet does too. The header's inset grows with the radius
(30% of it, at least 0.75rem), so the close disc stays clear of the larger top corners: 1rem at
the 54px corners of a 17 Pro, where the disc's edge is then about 17px from the curve.

The owner's screenshot of the entry input showed the large bottom corners on a page with a bar
above it ("habit.tem.sh") and a toolbar under it. There the sheet does not touch the screen's
corners. iOS reports `navigator.standalone` for a Home Screen app even when it shows such a
toolbar, so the standalone check alone was not enough. The sheet now hugs only when the page also
reaches the screen's bottom edge: the page is as tall as the screen, less at most 80pt for a
status bar above it. A toolbar and a top bar take far more.

## The keyboard

iOS does not resize the page for the keyboard: it ignores
`interactive-widget=resizes-content`. Only the visual viewport gets shorter, and iOS may pan it
down inside the page to show the focused field. A fixed sheet stays where it was, under the
keyboard.

Base UI's `Drawer.VirtualKeyboardProvider` keeps the sheet in place and scrolls its content: it
adds bottom padding to the scroll container as tall as the part under the keyboard, and scrolls
the field to the middle of the visible part. It also focuses a tapped field without the page's
scroll, and undoes a scroll of the window. It does not move the sheet. With our sheet, which
grows with its content, the extra padding made the sheet grow to almost the full height, and the
sticky footer stopped in the middle of the sheet (the owner's first screenshot). When iOS panned
the visual viewport (the owner's second screenshot), the sheet's top left the screen.

`trackSheetViewport()` (`components/sheet-viewport.ts`) listens to the visual viewport. When it is
more than 60px shorter than the page (a keyboard, not a pinch zoom), it gives `.sheet-viewport`
the visible band: `--sheet-vv-top` and `--sheet-vv-bottom`, the band's distances from the top and
the bottom of the page. The sheet sits 0.5rem above the keyboard, is at most the band less 1rem
and the top inset, and scrolls inside. Base UI then finds nothing under the keyboard, adds no
padding, and only scrolls the focused field into view. The footer sticks to the sheet's bottom.
The values are written in the viewport events, before Base UI measures in the next frame. Chrome
on Android resizes the page for the keyboard, so there the sheet needs no help.

## The fixed header

The sheet is a column: the handle and the header at the top, the footer at the bottom, and
between them `.sheet-scroll`, the only part that scrolls. Before, the whole popup scrolled, and the
handle and the header went up with the content (the owner's screenshot of "New habit" with the
inline picker open). Base UI's swipe finds the scroll area by itself: a swipe down dismisses from
the header, or from the body when it is at the top.

## A sheet over a sheet

`ResponsiveSheet` takes `nested` for a sheet that opens inside another one: the icon picker over
the habit form. On a phone it is a Base UI nested drawer. It renders no scrim, no edge bands, and
does not dim `theme-color` again: the sheet under it does that. Base UI marks the sheet under it
with `data-nested-drawer-open` and gives it `--drawer-height`, `--drawer-frontmost-height` and,
during a swipe of the sheet in front, `--drawer-swipe-progress`. With them, `.sheet-popup` scales to
0.94 from its top edge, dims, and rises until its top edge shows 0.625rem above the sheet in front,
and comes back in step with the swipe. The nested viewport leaves 0.625rem more room at the top,
so the sheet in front never covers that edge, even when both are as tall as they can be.

## Checks

- `components/sheet-viewport.test.ts`: the keyboard band, the pan, the pinch zoom, the corner
  table, the page that does not reach the bottom edge, the blended theme color.
- In Chrome, the stacked picker frame by frame: the form scales from 1 to 0.94, rises and dims
  with the sheet spring while the picker slides up; a touch swipe of 440px on the picker's header
  closes only the picker, and the form comes back to its full size.
- In Chrome (fake provider, 402×874 at 3x, safe areas replaced as in `docs/notes/pwa.md`): the
  screenshots of the PR. The keyboard is a fake `visualViewport` (416pt tall, and panned by 396pt
  for the Limit field) with a gray box drawn where the keyboard would be.
- In Chrome, on the habit page with the edit sheet open, the element at the middle of the top and
  the bottom edge, 4px in: before, `.sheet-viewport` (transparent, full screen); after,
  `.sheet-edge` with the scrim's color.

## For the owner, on the iPhone

1. Installed app, light appearance: open "New habit". The status bar band must dim with the page.
   Close it: the band must turn white again. Do it again in the dark appearance (the band stays
   black).
2. Safari, light appearance: open "New habit" on the list, and "Edit" on a habit page. The top
   bar and the bottom bar must both dim with the page. Close: both must turn back.
3. Installed app: any sheet. Its bottom corners must follow the screen's corners with an even
   gap of about 0.5rem, and the "Add habit" button must stay clear of the home indicator.
4. Installed app and Safari: in "New habit", tap Name. The sheet must sit right above the
   keyboard, the "Add habit" button at its bottom, and nothing of the form may show under the
   button or under the keyboard's bar. The list behind must not move.
5. Choose Quit and Number, and tap Limit. The sheet's top must stay on the screen, with no gray gap
   above the keyboard. Scroll the sheet: the button stays at its bottom.
6. With the keyboard up, move between the fields with the keyboard's arrows, and close the
   keyboard with its check mark: the sheet must go back down (in the installed app, to the screen's
   corners).
7. Swipe a sheet down to dismiss it: the scrim, the status bar band and Safari's bars come back.
8. Any sheet, in the installed app and in Safari: the four corners have the same radius. In the
   installed app, it follows the screen's corners; with a browser bar under the page, it is the
   normal small radius. The close button stays clear of the top right corner.
9. "New habit", then the icon tile: the picker slides up over the form. The form shrinks a little,
   dims, and shows its top edge above the picker. Swipe the picker down: only the picker closes,
   and the form grows back with the finger. Do the same with an Option's emoji in "Edit".
10. A long sheet (the edit sheet of a choice habit): scroll it. The handle and the header stay at
    the top.
