// Node runs the TypeScript of the scripts itself (type stripping), but the workspace packages use
// imports without an extension, such as "./day", which Node does not resolve. This hook tries the
// same path with ".ts" when the plain one is not found. Load it with `node --import`.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".") || /\.[cm]?[jt]sx?$/.test(specifier)) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});
