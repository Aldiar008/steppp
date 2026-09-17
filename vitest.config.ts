import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // Screen-level tests live in tests/; the deterministic core keeps its
    // tests next to the code they pin.
    include: ["tests/**/*.test.{ts,tsx}", "lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["engine/**/*.ts", "lib/**/*.ts"],
      reporter: ["text-summary"],
    },
  },
});
