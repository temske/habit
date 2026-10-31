import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import type { Plugin } from "vite-plus";

const WORKER_FILE = "sw.js";
const PLACEHOLDER = "self.__HABIT_PRECACHE__";

/** What the precache rule needs to know of one output file. */
export interface OutputFile {
  fileName: string;
  /** A chunk that only a dynamic `import()` loads. */
  dynamicOnly: boolean;
  /** The module of a chunk, for a chunk made of one module. */
  module: string | null;
}

/**
 * Whether the worker fetches a file of the build at install. The rest loads on first use and is
 * cached then (`sw/strategy.ts`).
 *
 * - Not the Phosphor icons that a habit loads by name: about 200 chunks, of which the owner uses
 *   a few.
 * - Of the fonts, only IBM Plex Sans in Latin and Latin Extended, as WOFF2. The other subsets, the
 *   WOFF copies for old browsers, and IBM Plex Mono (the "no access" screen) load when a page
 *   needs them.
 */
export function precached(file: OutputFile): boolean {
  const name = file.fileName;
  if (name === WORKER_FILE || name.endsWith(".map")) return false;
  if (file.dynamicOnly && file.module?.includes("@phosphor-icons/react") === true) return false;
  if (/\.(woff2?|ttf|otf)$/.test(name)) {
    return /(^|\/)ibm-plex-sans-latin(-ext)?-wght-normal-[^/]*\.woff2$/.test(name);
  }
  return true;
}

/** The files of the public directory, as paths from it. */
async function publicFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split("\\").join("/"));
}

/**
 * Builds `sw/worker.ts` to `/sw.js` and writes into it the list of files to precache, with a
 * version that changes when any of them changes. Build only: the dev server has no worker.
 */
export function serviceWorker(): Plugin {
  let publicDir = "";
  return {
    name: "habit:service-worker",
    apply: "build",
    // After Vite's HTML plugin, which emits index.html in its own `generateBundle`.
    enforce: "post",
    configResolved(config) {
      publicDir = config.publicDir;
    },
    buildStart() {
      const entry = fileURLToPath(new URL("../sw/worker.ts", import.meta.url));
      this.emitFile({ type: "chunk", id: entry, fileName: WORKER_FILE });
    },
    async generateBundle(_options, bundle) {
      const worker = bundle[WORKER_FILE];
      if (worker === undefined || worker.type !== "chunk") {
        this.error(`${WORKER_FILE} is missing from the bundle`);
      }
      if (worker.imports.length > 0 || worker.dynamicImports.length > 0) {
        // A classic worker cannot import: everything it needs must be in sw.js.
        this.error(`${WORKER_FILE} imports other chunks: ${worker.imports.join(", ")}`);
      }

      const files: Array<{ url: string; content: string | Uint8Array }> = [];
      for (const output of Object.values(bundle)) {
        const file: OutputFile =
          output.type === "chunk"
            ? {
                fileName: output.fileName,
                dynamicOnly: output.isDynamicEntry && !output.isEntry,
                module: output.facadeModuleId,
              }
            : { fileName: output.fileName, dynamicOnly: false, module: null };
        if (!precached(file)) continue;
        files.push({
          url: output.fileName === "index.html" ? "/" : `/${output.fileName}`,
          content: output.type === "chunk" ? output.code : output.source,
        });
      }
      for (const name of await publicFiles(publicDir)) {
        files.push({ url: `/${name}`, content: await readFile(join(publicDir, name)) });
      }
      files.sort((a, b) => a.url.localeCompare(b.url));

      const hash = createHash("sha256");
      for (const file of files) hash.update(file.url).update("\0").update(file.content);
      const precache = { version: hash.digest("hex").slice(0, 16), urls: files.map((f) => f.url) };

      if (!worker.code.includes(PLACEHOLDER)) this.error(`${PLACEHOLDER} is missing from sw.js`);
      worker.code = worker.code.replace(PLACEHOLDER, JSON.stringify(precache));
    },
  };
}
