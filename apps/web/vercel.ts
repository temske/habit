import type { VercelConfig } from "@vercel/config/v1";

// The Vercel project "habit" builds this app. Its Root Directory is apps/web. docs/deploy.md
// describes the deployment.
export const config: VercelConfig = {
  framework: "vite",
  // Vercel installs the workspace itself: it takes pnpm from the root package.json's devEngines and
  // Node.js from its engines. `vp` is then the local CLI of the `vite-plus` dev dependency.
  buildCommand: "vp build",
  outputDirectory: "dist",
  // A single-page app: each path that is not a file goes to index.html, and the router reads it.
  // Vercel serves a file that exists before it applies a rewrite. A missing file under /assets/ (a
  // chunk of an older build) stays a 404, so the browser does not get index.html as a script.
  rewrites: [{ source: "/((?!assets/).*)", destination: "/index.html" }],
  // Vite puts a hash of the content in each file name under /assets/: a new build makes new names.
  headers: [
    {
      source: "/assets/(.*)",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
  ],
};
