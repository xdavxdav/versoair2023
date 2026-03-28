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
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-tiptap": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-image",
            "@tiptap/extension-link",
            "@tiptap/extension-text-align",
            "@tiptap/extension-color",
            "@tiptap/extension-text-style",
          ],
          "vendor-quill": ["react-quill"],
        },
      },
    },
  },

  // ✅ SERVER CONFIG - Single port 5003 for frontend + backend
  server: {
    port: 5003,
    host: "localhost",
    strictPort: false,
    open: false,

    // ✅ HMR connects to port 5003 (no separate dev server)
    hmr: {
      host: "localhost",
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
