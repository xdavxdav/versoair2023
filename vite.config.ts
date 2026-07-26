import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@db": path.resolve(__dirname, "db"),
      "@shared": path.resolve(__dirname, "shared"),
      "@server": path.resolve(__dirname, "server"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: false, // Don't delete dist folder - esbuild needs dist/index.js
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy editor deps
          "vendor-tiptap": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-image",
            "@tiptap/extension-link",
            "@tiptap/extension-text-align",
            "@tiptap/extension-color",
            "@tiptap/extension-text-style",
          ],
          // Core UI libs
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
          ],
          // Animation/motion
          "vendor-motion": ["framer-motion"],
          // Charts
          "vendor-charts": ["recharts"],
          // React core
          "vendor-react": ["react", "react-dom"],
          // Data fetching
          "vendor-query": ["@tanstack/react-query"],
        },
      },
    },
  },

  // ✅ SERVER CONFIG - Single port 5003 for frontend + backend
  server: {
    port: 5003,
    host: "0.0.0.0",
    strictPort: false,
    open: false,

    // ✅ HMR connects to port 5003 (no separate dev server)
    hmr: {
      host: "10.0.0.93",
      port: 5003,
      protocol: "ws",
      clientPort: 5003,
    },

    // ✅ Proxy API requests to Express server (same port)
    proxy: {
      "/api": {
        target: "http://localhost:5003",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },

    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },

  // ✅ Fix global variable issues + production API URL override.
  // In production, force VITE_API_URL to "" so all fetch() calls use relative
  // paths (same-origin). This prevents stale localhost:5003 URLs being baked
  // into the bundle when the env var isn't set correctly on Render/Vercel.
  define: {
    "process.env": {},
    global: "window",
    ...(process.env.NODE_ENV === "production"
      ? { "import.meta.env.VITE_API_URL": JSON.stringify("") }
      : {}),
  },
});
