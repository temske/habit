/**
 * Dims the `theme-color` of the page while a bottom sheet's scrim shows. In the installed app on
 * iOS the status bar is a band outside the page ("default" style), colored from theme-color, so the
 * scrim cannot reach it. Safari 26 ignores theme-color for its own bars; the sheet's edge bands
 * handle those (styles.css, `.sheet-edge`).
 */

/** The scrim's black, as in the `--backdrop` token: 20% on the light ground, 60% on the dark. */
const SCRIM_ALPHA = { light: 0.2, dark: 0.6 } as const;
const DURATION = 400;

/** `hex` (#rgb or #rrggbb) under black at `alpha`, as #rrggbb. Null for another color syntax. */
export function dimHex(hex: string, alpha: number): string | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (match === null) return null;
  const digits = match[1] ?? "";
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((d) => d + d)
          .join("")
      : digits;
  const channels = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
  return `#${channels
    .map((c) =>
      Math.round(c * (1 - alpha))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

interface Tag {
  meta: HTMLMetaElement;
  original: string;
  alpha: number;
}

let openSheets = 0;
let level = 0;
let frame = 0;
let tags: Tag[] | null = null;

function readTags(): Tag[] {
  tags ??= Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')).map(
    (meta) => ({
      meta,
      original: meta.content,
      alpha: meta.media.includes("dark") ? SCRIM_ALPHA.dark : SCRIM_ALPHA.light,
    }),
  );
  return tags;
}

function paint(): void {
  for (const tag of readTags()) {
    const dimmed = level === 0 ? tag.original : dimHex(tag.original, tag.alpha * level);
    if (dimmed !== null && tag.meta.content !== dimmed) tag.meta.content = dimmed;
  }
}

/** Moves the dim toward `target` (0 or 1) in step with the scrim's 400ms fade. */
function animateTo(target: number): void {
  cancelAnimationFrame(frame);
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof requestAnimationFrame !== "function") {
    level = target;
    paint();
    return;
  }
  const from = level;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / DURATION);
    // An ease-out, close to the scrim's --ease-drawer.
    level = from + (target - from) * (1 - (1 - t) ** 3);
    paint();
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

/** Dims the theme color until the returned function runs. Sheets may overlap; the last one out restores it. */
export function dimThemeColor(): () => void {
  openSheets += 1;
  if (openSheets === 1) animateTo(1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    openSheets -= 1;
    if (openSheets === 0) animateTo(0);
  };
}
