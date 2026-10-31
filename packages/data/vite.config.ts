import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      unit: "vp test",
      // The import of a HabitKit export (docs/import.md): `vp -C packages/data run
      // import:habitkit <file> --dry-run`. It writes to a deployment, so it is never cached.
      "import:habitkit": {
        command: "node --import ./scripts/resolve-ts.ts scripts/import-habitkit.ts",
        cache: false,
      },
    },
  },
  test: {
    name: "data",
    include: ["src/**/*.test.{ts,tsx}", "convex/**/*.test.ts"],
    // The provider's tests run in jsdom. The Convex functions' tests choose edge-runtime in their
    // first line, as the Convex runtime is closer to it than to Node.
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
