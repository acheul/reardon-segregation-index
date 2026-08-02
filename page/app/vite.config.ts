import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  // GitHub Pages serves from a repo subpath; relative base keeps assets working.
  base: "./",
  build: {
    outDir: "../../docs",
    emptyOutDir: true,
  },
});
