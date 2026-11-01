import { describe, expect, test } from "vite-plus/test";

import {
  displayCornerRadius,
  sheetViewportState,
  type ViewportMetrics,
} from "@/components/sheet-viewport";
import { dimHex } from "@/components/theme-color";

// An iPhone 17 Pro, installed to the Home Screen, keyboard closed.
const phone: ViewportMetrics = {
  layoutHeight: 874,
  visual: { height: 874, offsetTop: 0, scale: 1 },
  standalone: true,
  screen: { width: 402, height: 874 },
};

describe("the sheet's place", () => {
  test("in the installed app, the sheet hugs the display's corners", () => {
    expect(sheetViewportState(phone)).toEqual({ keyboard: null, hug: 62 });
  });

  test("in Safari, the sheet floats above the bar", () => {
    expect(sheetViewportState({ ...phone, standalone: false }).hug).toBeNull();
  });

  test("on a screen of unknown corners, the sheet floats", () => {
    expect(sheetViewportState({ ...phone, screen: { width: 412, height: 915 } }).hug).toBeNull();
  });

  test("with the iOS keyboard up, the sheet sits on it and stops hugging", () => {
    const state = sheetViewportState({
      ...phone,
      visual: { height: 490, offsetTop: 0, scale: 1 },
    });
    expect(state).toEqual({ keyboard: { top: 0, bottom: 384 }, hug: null });
  });

  test("when iOS pans the visible band down to reveal a field, the sheet follows the band", () => {
    const state = sheetViewportState({
      ...phone,
      visual: { height: 490, offsetTop: 384, scale: 1 },
    });
    expect(state.keyboard).toEqual({ top: 384, bottom: 0 });
  });

  test("a browser that resizes the page for the keyboard needs no lift", () => {
    const state = sheetViewportState({
      ...phone,
      layoutHeight: 490,
      visual: { height: 490, offsetTop: 0, scale: 1 },
    });
    expect(state.keyboard).toBeNull();
  });

  test("a pinch zoom is not a keyboard", () => {
    const state = sheetViewportState({
      ...phone,
      standalone: false,
      visual: { height: 400, offsetTop: 200, scale: 2 },
    });
    expect(state.keyboard).toBeNull();
  });
});

test("the display's corner radius reads either orientation", () => {
  expect(displayCornerRadius(874, 402)).toBe(62);
  expect(displayCornerRadius(393, 852)).toBe(55);
  expect(displayCornerRadius(375, 667)).toBeNull();
});

test("the theme color under the scrim is the ground blended with the scrim's black", () => {
  expect(dimHex("#ffffff", 0.2)).toBe("#cccccc");
  expect(dimHex("#fff", 0.2)).toBe("#cccccc");
  expect(dimHex("#000000", 0.6)).toBe("#000000");
  expect(dimHex("white", 0.2)).toBeNull();
});
