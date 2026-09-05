#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const CLIENT_DIR = path.join(ROOT, "client");
const SRC_DIR = path.join(CLIENT_DIR, "src");
const PUBLIC_DIR = path.join(CLIENT_DIR, "public");

function backup(file) {
  const bak = file + ".bak-" + Date.now();
  if (fs.existsSync(file)) fs.copyFileSync(file, bak);
  return bak;
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}
function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function findMainTsx() {
  const candidates = [
    path.join(SRC_DIR, "main.tsx"),
    path.join(SRC_DIR, "main.jsx"),
    path.join(CLIENT_DIR, "src", "main.tsx"),
    path.join(CLIENT_DIR, "src", "main.jsx"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("main.tsx/main.jsx non trouvé");
}

function createManifest() {
  const manifest = {
    name: "Verso Air",
    short_name: "VersoAir",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
  const file = path.join(PUBLIC_DIR, "manifest.json");
  backup(file);
  write(file, JSON.stringify(manifest, null, 2));
  console.log("manifest.json créé");
}

function createServiceWorker() {
  const sw = `// Service Worker vanilla pour Verso Air
const CACHE_NAME = 'versoair-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
`;
  const file = path.join(PUBLIC_DIR, "service-worker.js");
  backup(file);
  write(file, sw);
  console.log("service-worker.js créé dans public/");
}

function patchMainTsx() {
  const mainFile = findMainTsx();
  backup(mainFile);
  let content = read(mainFile);

  if (
    content.includes("serviceWorker") ||
    content.includes("navigator.serviceWorker")
  ) {
    console.log("Service worker déjà enregistré");
    return;
  }

  const regBlock = `
// Enregistrement du Service Worker PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => console.log('SW enregistré:', reg.scope))
      .catch((err) => console.error('SW échec:', err));
  });
}
`;
  content = content.trimEnd() + "\n" + regBlock + "\n";
  write(mainFile, content);
  console.log("main.tsx patché avec enregistrement SW");
}

function addManifestLink() {
  const indexHtml = path.join(CLIENT_DIR, "index.html");
  if (!fs.existsSync(indexHtml)) {
    console.log("index.html non trouvé, lien manifest non ajouté");
    return;
  }
  backup(indexHtml);
  let content = read(indexHtml);
  if (content.includes("manifest.json")) {
    console.log("Lien manifest déjà présent");
    return;
  }
  content = content.replace(
    /<\/head>/,
    '  <link rel="manifest" href="/manifest.json" />\n  </head>',
  );
  write(indexHtml, content);
  console.log("index.html patché avec manifest");
}

console.log("=== PATCH PWA ===");
try {
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  createManifest();
  createServiceWorker();
  patchMainTsx();
  addManifestLink();
  console.log("✅ patch-pwa.js terminé.\n");
  process.exit(0);
} catch (e) {
  console.error("❌ Erreur:", e.message);
  process.exit(1);
}
