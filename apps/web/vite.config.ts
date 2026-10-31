import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite-plus";

import { serviceWorker } from "./build/service-worker";

/**
 * Opens the connection to Clerk's Frontend API while the app's own JS loads. The start waits for
 * Clerk's check of the session, which comes from that host, so the handshake is done by the time
 * Clerk asks. The host is in the publishable key: `pk_test_` or `pk_live_`, then the host and a `$`
 * in base64. Two links: Clerk's UI script loads without credentials, the session check with them,
 * and the browser keeps those connections apart. (Clerk's main script ships in the app's bundle.)
 */
function clerkPreconnect(): Plugin {
  let host: string | undefined;
  return {
    name: "habit:clerk-preconnect",
    configResolved(config) {
      const key = config.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
      if (config.env.VITE_HABIT_DATA === "fake" || key === undefined) return;
      const decoded = Buffer.from(key.replace(/^pk_(test|live)_/, ""), "base64").toString("utf8");
      host = decoded.endsWith("$") ? decoded.slice(0, -1) : undefined;
    },
    transformIndexHtml() {
      if (host === undefined) return [];
      const href = `https://${host}`;
      return [
        { tag: "link", attrs: { rel: "preconnect", href }, injectTo: "head-prepend" },
        {
          tag: "link",
          attrs: { rel: "preconnect", href, crossorigin: "" },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

export default defineConfig({
  // The router plugin must run before React's.
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    clerkPreconnect(),
    serviceWorker(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  run: {
    // This package's tests as a cached task, so `vp run ready` replays them when nothing they read
    // changed.
    tasks: {
      unit: "vp test",
      // The end-to-end check on the real backend (e2e/real-backend.ts). It needs the network and
      // the Convex CLI's login, so `vp run ready` does not run it, and it is never cached.
      e2e: { command: "node e2e/real-backend.ts", cache: false },
      // The check of the installable app on a production build (e2e/pwa.ts). It needs Google
      // Chrome and a free port, so it is not part of `vp run ready`.
      pwa: { command: "node e2e/pwa.ts", cache: false },
      // Draws the app icon into public/ (scripts/icons.ts). It needs Google Chrome.
      icons: { command: "node scripts/icons.ts", cache: false },
    },
  },
  test: {
    name: "web",
    include: ["{src,sw,build}/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
