import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom"] },
  build: { rollupOptions: { input: { app: "index.html", animationPreview: "animation-preview.html", animationRender: "animation-render.html", workbench: "workbench.html", editor: "src/features/revision/editor-layout.html" } } },
  server: {
    host: "127.0.0.1",
    proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: false } },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
