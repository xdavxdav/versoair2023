import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [react(), runtimeErrorOverlay()],
  resolve: {
    alias: {
      "..": path.resolve(__dirname, "src"),
      "../server": path.resolve(__dirname, "..", "server"),
      "../db": path.resolve(__dirname, "..", "db"),
      "..shared": path.resolve(__dirname, "..", "shared"),
    },
  },
  server: {
    port: 5003,
    host: "localhost",
    strictPort: false,
    open: false,
    hmr: {
      host: "localhost",
      port: 5003,
      protocol: "ws",
    },
    proxy: {
      "/api": {
        target: "http://localhost:5003",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
