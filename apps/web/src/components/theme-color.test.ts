import { describe, expect, it } from "vite-plus/test";

import { easeDrawer } from "./theme-color";

describe("easeDrawer", () => {
  // Chrome's own `cubic-bezier(0.32, 0.72, 0, 1)` at these times (a Web Animation, sampled), so the
  // status bar dims on the scrim's curve.
  it("follows the scrim's --ease-drawer curve", () => {
    const chrome: [number, number][] = [
      [0.1, 0.269821],
      [0.25, 0.779131],
      [0.5, 0.954809],
      [0.75, 0.992349],
    ];
    for (const [t, progress] of chrome) expect(easeDrawer(t)).toBeCloseTo(progress, 4);
  });

  it("starts at 0 and ends at 1", () => {
    expect(easeDrawer(0)).toBe(0);
    expect(easeDrawer(1)).toBe(1);
  });
});
