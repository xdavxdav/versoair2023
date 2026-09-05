#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = process.cwd();
const CLIENT_DIR = path.join(ROOT, "client");
const SRC_DIR = path.join(CLIENT_DIR, "src");

// --- Helpers ---
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
  throw new Error("main.tsx/main.jsx non trouvé dans client/src/");
}

function findPagesDir() {
  const candidates = ["pages", "app", "routes", "views"];
  for (const c of candidates) {
    const p = path.join(SRC_DIR, c);
    if (fs.existsSync(p)) return p;
  }
  return SRC_DIR;
}

function getPageTitle(filename) {
  const name = path.basename(filename, path.extname(filename));
  const map = {
    Home: "Accueil — Verso Air",
    About: "À propos — Verso Air",
    Contact: "Contact — Verso Air",
    Login: "Connexion — Verso Air",
    Register: "Inscription — Verso Air",
    Dashboard: "Tableau de bord — Verso Air",
    Profile: "Profil — Verso Air",
    Settings: "Paramètres — Verso Air",
    Admin: "Administration — Verso Air",
  };
  return map[name] || `${name} — Verso Air`;
}

function injectHelmet(filePath) {
  let content = read(filePath);
  const name = path.basename(filePath, path.extname(filePath));
  const title = getPageTitle(name);

  if (content.includes("<Helmet")) return false;

  if (!content.includes("react-helmet-async")) {
    content = `import { Helmet } from 'react-helmet-async';\n${content}`;
  }

  // Si déjà fragment
  if (content.includes("<>") || content.includes("<React.Fragment>")) {
    content = content.replace(
      /(return\s*\(\s*(?:<>|<React\.Fragment>))/i,
      `$1\n      <Helmet>\n        <title>${title}</title>\n        <meta name="description" content="${title}" />\n      </Helmet>`,
    );
    write(filePath, content);
    return true;
  }

  // Élément racine unique → wrap dans fragment
  const match = content.match(/return\s*\(\s*(<[\w]+)/);
  if (!match) return false;

  content = content.replace(
    /return\s*\(\s*(<[\w]+)/,
    `return (\n    <>\n      <Helmet>\n        <title>${title}</title>\n        <meta name="description" content="${title}" />\n      </Helmet>\n      $1`,
  );

  // Ferme le fragment avant le ); final
  const lines = content.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === ");" || line === ")") {
      const indent = lines[i].match(/^(\s*)/)[1];
      lines.splice(i, 0, indent + "</>");
      break;
    }
  }
  content = lines.join("\n");
  write(filePath, content);
  return true;
}

function patchMainTsx() {
  const mainFile = findMainTsx();
  backup(mainFile);
  let content = read(mainFile);

  if (content.includes("HelmetProvider")) {
    console.log("HelmetProvider déjà présent dans main.tsx");
    return;
  }

  if (!content.includes("react-helmet-async")) {
    content =
      `import { HelmetProvider } from 'react-helmet-async';\n` + content;
  }

  // React 18 createRoot pattern
  content = content.replace(
    /(\.render\s*\(\s*)(<StrictMode>)?/,
    "$1<HelmetProvider>\n      $2",
  );
  content = content.replace(
    /(<\/StrictMode>\s*\);)/,
    "$1\n    </HelmetProvider>",
  );

  // Fallback si pas de StrictMode
  if (!content.includes("</HelmetProvider>")) {
    content = content.replace(
      /(\.render\s*\(\s*)(<App)/,
      "$1<HelmetProvider>\n      $2",
    );
    content = content.replace(/(<\/App>\s*\);)/, "$1\n    </HelmetProvider>");
  }

  write(mainFile, content);
  console.log("main.tsx patché avec HelmetProvider");
}

function patchPages() {
  console.log(
    "Injection des pages désactivée: les pages peuvent contenir plusieurs retours JSX.",
  );
}

function installDep() {
  console.log("Installation de react-helmet-async...");
  const pkgJson = path.join(ROOT, "package.json");
  if (!fs.existsSync(pkgJson)) {
    throw new Error(
      "package.json non trouvé. Exécute depuis la racine du projet.",
    );
  }
  execSync("npm install react-helmet-async", { cwd: ROOT, stdio: "inherit" });
}

// --- Run ---
console.log("=== PATCH SEO ===");
try {
  // // installDep();
  patchMainTsx();
  patchPages();
  console.log("✅ patch-seo.js terminé.\n");
  process.exit(0);
} catch (e) {
  console.error("❌ Erreur:", e.message);
  process.exit(1);
}
