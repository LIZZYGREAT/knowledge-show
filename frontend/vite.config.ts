import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: { app: "index.html", animationPreview: "animation-preview.html" } } },
  server: { host: "127.0.0.1" },
  test: { include: ["tests/**/*.test.ts"] },
});
