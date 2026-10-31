import { expect, test } from "vite-plus/test";

import { onNewWorker, START_MS } from "@/service-worker";

test("a new version loads at once only while the app is starting", () => {
  expect(onNewWorker({ visible: true, visibleSince: 0, now: START_MS - 1 })).toBe("reload");
  // In use: wait until the app comes back to the screen.
  expect(onNewWorker({ visible: true, visibleSince: 0, now: START_MS + 1 })).toBe("wait");
  expect(onNewWorker({ visible: false, visibleSince: 0, now: 1 })).toBe("wait");
});
