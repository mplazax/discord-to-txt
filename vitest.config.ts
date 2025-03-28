import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    setupFiles: ["./tests/setup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "src/popup/popup": path.resolve(__dirname, "./src/popup/popup.ts"),
      "src/background/background": path.resolve(
        __dirname,
        "./src/background/background.ts"
      ),
    },
  },
});
