import type { HabitColor, HabitIcon as HabitIconValue } from "@habit/core";
import type { Icon } from "@phosphor-icons/react";
import { lazy, Suspense, useState, type CSSProperties, type LazyExoticComponent } from "react";

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
 * when it comes. An icon loaded before (`loadHabitIcons`) draws in the first frame.
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

  return <PhosphorHabitIcon name={icon.name} box={box} style={style} />;
}

function PhosphorHabitIcon({
  name,
  box,
  style,
}: {
  name: string;
  box: string;
  style: CSSProperties;
}) {
  const key = iconKey(name);
  // An icon that was not loaded at the first render of its name comes later than its row: it
  // fades in. It keeps that path until it changes, so a render during its fade does not cut it.
  const [first, setFirst] = useState(() => ({ key, late: !loadedIcons.has(key) }));
  if (first.key !== key) setFirst({ key, late: !loadedIcons.has(key) });
  const Loaded = first.key === key && !first.late ? loadedIcons.get(key) : undefined;
  if (Loaded !== undefined) {
    return (
      <span className={box} style={style} aria-hidden>
        <Loaded weight="duotone" size="100%" />
      </span>
    );
  }
  const PhosphorIcon = lazyIcon(key);
  return (
    <span className={box} style={style} aria-hidden>
      <Suspense fallback={null}>
        <PhosphorIcon weight="duotone" size="100%" className="habit-icon-late" />
      </Suspense>
    </span>
  );
}

/** The icons whose chunk has loaded, so they render at once from now on. */
const loadedIcons = new Map<string, Icon>();
/** The load of each icon, started once. */
const loadingIcons = new Map<string, Promise<Icon>>();
const lazyIcons = new Map<string, LazyExoticComponent<Icon>>();

/** The icons whose chunk failed to load, to load again when the network is back. */
const failedIcons = new Set<string>();
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    for (const key of failedIcons) {
      loadingIcons.delete(key);
      lazyIcons.delete(key);
    }
    failedIcons.clear();
  });
}

const NoIcon = (() => null) as unknown as Icon;

function iconKey(name: string): string {
  return name in PHOSPHOR_ICON_LOADERS ? name : "circle";
}

function loadIcon(key: string): Promise<Icon> {
  let loading = loadingIcons.get(key);
  if (loading === undefined) {
    loading = PHOSPHOR_ICON_LOADERS[key]!().then(
      (Loaded) => {
        loadedIcons.set(key, Loaded);
        return Loaded;
      },
      () => {
        // Offline, an icon that this device never loaded is not in the service worker's cache.
        // The box stays empty, and the icon loads again on a render after the network is back.
        failedIcons.add(key);
        return NoIcon;
      },
    );
    loadingIcons.set(key, loading);
  }
  return loading;
}

function lazyIcon(key: string): LazyExoticComponent<Icon> {
  let component = lazyIcons.get(key);
  if (component === undefined) {
    component = lazy(() => loadIcon(key).then((Loaded) => ({ default: Loaded })));
    lazyIcons.set(key, component);
  }
  return component;
}

/**
 * Loads the icons of these habits. Resolves when each one has loaded or failed, or after
 * `timeoutMs`, so a slow network cannot hold the caller. Never rejects.
 */
export function loadHabitIcons(
  icons: readonly HabitIconValue[],
  timeoutMs = Infinity,
): Promise<void> {
  const loads = icons.flatMap((icon) =>
    icon.type === "phosphor" ? [loadIcon(iconKey(icon.name))] : [],
  );
  const all = Promise.all(loads).then(() => undefined);
  if (loads.length === 0 || timeoutMs === Infinity) return all;
  return Promise.race([all, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}

/** Starts loading the icons of these habits, so the list paints them without a gap. */
export function preloadHabitIcons(icons: readonly HabitIconValue[]): void {
  void loadHabitIcons(icons);
}
