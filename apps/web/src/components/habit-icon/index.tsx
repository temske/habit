import type { HabitColor, HabitIcon as HabitIconValue } from "@habit/core";
import type { Icon } from "@phosphor-icons/react";
import { lazy, Suspense, type CSSProperties, type LazyExoticComponent } from "react";

import { PHOSPHOR_ICON_LOADERS } from "@/components/habit-icon/catalog";
import { habitColorVar } from "@/components/palette";
import { cn } from "@/lib/utils";

export { PHOSPHOR_ICON_GROUPS } from "@/components/habit-icon/catalog";

export interface HabitIconProps {
  icon: HabitIconValue;
  color: HabitColor;
  /** The side, as a CSS length. Default: `var(--icon)` (22px on a phone). */
  size?: string;
  className?: string;
}

/**
 * The icon of a habit: a Phosphor icon in the duotone weight, drawn in the habit color with no
 * tile behind it (the duotone's 20% layer is its soft tint), or an emoji. A Phosphor icon loads on
 * first use; until then the box keeps its size, so the row does not move, and the icon fades in
 * when it comes.
 */
export function HabitIcon({ icon, color, size, className }: HabitIconProps) {
  const style = {
    "--c": habitColorVar(color),
    ...(size === undefined ? {} : { "--icon-size": size }),
  } as CSSProperties;
  const box = cn(
    "inline-grid size-(--icon-size,var(--icon)) flex-none place-items-center text-habit",
    className,
  );

  if (icon.type === "emoji") {
    return (
      <span className={box} style={style} aria-hidden>
        <span className="text-[calc(var(--icon-size,var(--icon))*0.9)] leading-none">
          {icon.emoji}
        </span>
      </span>
    );
  }

  const PhosphorIcon = phosphorIcon(icon.name);
  // An icon that was not loaded at this render comes later than its row: it fades in.
  const late = !loadedIcons.has(iconKey(icon.name));
  return (
    <span className={box} style={style} aria-hidden>
      <Suspense fallback={null}>
        <PhosphorIcon
          weight="duotone"
          size="100%"
          className={late ? "habit-icon-late" : undefined}
        />
      </Suspense>
    </span>
  );
}

const lazyIcons = new Map<string, LazyExoticComponent<Icon>>();
/** The icons that have rendered once, so they render at once from now on. */
const loadedIcons = new Set<string>();

/** The icons whose chunk failed to load, to load again when the network is back. */
const failedIcons = new Set<string>();
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    for (const key of failedIcons) lazyIcons.delete(key);
    failedIcons.clear();
  });
}

const NoIcon = (() => null) as unknown as Icon;

function iconKey(name: string): string {
  return name in PHOSPHOR_ICON_LOADERS ? name : "circle";
}

function phosphorIcon(name: string): LazyExoticComponent<Icon> {
  const key = iconKey(name);
  let component = lazyIcons.get(key);
  if (component === undefined) {
    const load = PHOSPHOR_ICON_LOADERS[key]!;
    component = lazy(() =>
      load().then(
        (Loaded) => {
          loadedIcons.add(key);
          return { default: Loaded };
        },
        () => {
          // Offline, an icon that this device never loaded is not in the service worker's cache.
          // The box stays empty, and the icon loads again on a render after the network is back.
          failedIcons.add(key);
          return { default: NoIcon };
        },
      ),
    );
    lazyIcons.set(key, component);
  }
  return component;
}

/** Starts loading the icons of these habits, so the list paints them without a gap. */
export function preloadHabitIcons(icons: readonly HabitIconValue[]): void {
  for (const icon of icons) {
    if (icon.type === "phosphor") PHOSPHOR_ICON_LOADERS[icon.name]?.().catch(() => {});
  }
}
