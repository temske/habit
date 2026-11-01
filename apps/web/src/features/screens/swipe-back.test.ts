import { describe, expect, it } from "vite-plus/test";

import { completesSwipe, swipeIntent } from "@/features/screens/swipe-back";

describe("swipeIntent", () => {
  it("waits until the finger has moved far enough to tell", () => {
    expect(swipeIntent(6, 3)).toBe("wait");
  });

  it("takes a move to the right that is more sideways than vertical", () => {
    expect(swipeIntent(14, 4)).toBe("back");
    expect(swipeIntent(30, -20)).toBe("back");
  });

  it("leaves a scroll and a swipe to the left alone", () => {
    expect(swipeIntent(3, 20)).toBe("other");
    expect(swipeIntent(12, 12)).toBe("other");
    expect(swipeIntent(-20, 2)).toBe("other");
  });
});

describe("completesSwipe", () => {
  it("goes back past the middle of the screen, and stays before it", () => {
    expect(completesSwipe(0.6, 0)).toBe(true);
    expect(completesSwipe(0.4, 0)).toBe(false);
  });

  it("follows a flick, wherever the page is", () => {
    expect(completesSwipe(0.15, 0.6)).toBe(true);
    expect(completesSwipe(0.8, -0.6)).toBe(false);
  });
});
