import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs"; // We need the file system module
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import type { Plugin } from "vite";

// --- START: New, more powerful plugin to resolve the Vite transform error ---
const onnxMjsResolverPlugin: Plugin = {
  name: "onnx-mjs-resolver-plugin",

  // This hook intercepts module import paths.
  resolveId(source) {
    // If Vite tries to import one of the ONNX MJS files...
    if (source.startsWith("/ort/") && source.endsWith(".mjs")) {
      // ...we tell Vite that we are handling it by returning a special "virtual module ID".
      // The '\0' prefix is a convention telling other plugins to ignore this.
      return `\0virtual-onnx-mjs:${source}`;
    }
    return null; // Let Vite handle all other imports normally.
  },

  // This hook provides the code for virtual modules.
  load(id) {
    const prefix = "\0virtual-onnx-mjs:";
    // If Vite asks for the code for our special virtual module...
    if (id.startsWith(prefix)) {
      const originalPath = id.slice(prefix.length);
      const publicDir = path.resolve(process.cwd(), "client/public");
      const filePath = path.join(publicDir, originalPath);

      try {
        // ...we read the file from the public directory ourselves...
        const code = fs.readFileSync(filePath, "utf-8");
        // ...and return it as raw JavaScript code.
        return { code, map: null };
      } catch (error) {
        console.error(`[ONNX Plugin] Failed to load file: ${filePath}`, error);
        throw new Error(`Could not load ONNX MJS file: ${filePath}`);
      }
    }
    return null; // Let Vite handle all other modules normally.
  },
};
// --- END: New Plugin ---

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    onnxMjsResolverPlugin, // <-- Add our new, powerful plugin here.
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client/public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    // These headers are still 100% required for browser security.
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  optimizeDeps: {
    // Excluding onnxruntime-web is still a good safety measure.
    exclude: ["onnxruntime-web"],
  },
});
