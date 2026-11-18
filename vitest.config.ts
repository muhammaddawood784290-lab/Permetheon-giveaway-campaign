import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const projectRoot = path.resolve(process.cwd(), ".");

// Vitest-only config: load the current worktree .env so the real Supabase
// client imported during tests can resolve SUPABASE_URL /
// SUPABASE_PUBLISHABLE_KEY without changing production code.
const env = loadEnv("test", projectRoot, "");
if (typeof env["VITE_SUPABASE_URL"] === "string") {
  process.env["SUPABASE_URL"] = env["VITE_SUPABASE_URL"];
}
if (typeof env["VITE_SUPABASE_PUBLISHABLE_KEY"] === "string") {
  process.env["SUPABASE_PUBLISHABLE_KEY"] = env["VITE_SUPABASE_PUBLISHABLE_KEY"];
}

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    deps: { interopDefault: true },
  },
  resolve: {
    alias: { "@": path.resolve(projectRoot, "./src") },
  },
});
