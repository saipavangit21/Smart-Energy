import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api":  { target: "http://localhost:3001", changeOrigin: true },
      "/auth": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/")) return "vendor";
          if (id.includes("/pages/AdminDashboard")) return "page-admin";
          if (id.includes("/pages/BusinessPage") || id.includes("/pages/FleetAuditPage") || id.includes("/pages/SessionCalcPage")) return "page-business";
          if (id.includes("/pages/seo/")) return "page-seo";
        },
      },
    },
  },
});