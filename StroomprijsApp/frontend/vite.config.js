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
          // Only ever loaded via dynamic import() (bulk fleet-audit upload) —
          // excluded from the blanket vendor bucket so they split into their
          // own lazy chunk instead of bloating every page's shared bundle.
          if (id.includes("node_modules/xlsx") || id.includes("node_modules/papaparse")) return undefined;
          if (id.includes("node_modules/")) return "vendor";
          if (id.includes("/pages/AdminDashboard")) return "page-admin";
          if (id.includes("/pages/BusinessPage") || id.includes("/pages/FleetAuditPage") || id.includes("/pages/SessionCalcPage")) return "page-business";
          if (id.includes("/pages/seo/")) return "page-seo";
        },
      },
    },
  },
});