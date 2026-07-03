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
    outDir: path.resolve(__dirname, "dist-music/public"),
    emptyOutDir: true,
    rollupOptions: {
        input: path.resolve(__dirname, "client/music.html"),
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

  // ✅ SERVER CONFIG - Single port 5004 for frontend + backend
  server: {
    port: 5004,
    host: "0.0.0.0",
    strictPort: false,
    open: false,

    // ✅ HMR connects to port 5004 (no separate dev server)
    hmr: {
      host: "10.0.0.93",
      port: 5004,
      protocol: "ws",
      clientPort: 5004,
    },

    // ✅ Proxy API requests to Express server (same port)
    proxy: {
      "/api": {
        target: "http://localhost:5004",
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
  // paths (same-origin). This prevents stale localhost:5004 URLs being baked
  // into the bundle when the env var isn't set correctly on Render/Vercel.
  define: {
    "process.env": {},
    global: "window",
    ...(process.env.NODE_ENV === "production"
      ? { "import.meta.env.VITE_API_URL": JSON.stringify("") }
      : {}),
  },
});
