#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");

const ROOT = process.cwd();
const CLIENT_DIR = ROOT;

function runCheck() {
  console.log("\n🔍 Vérification TypeScript...");
  let cmd = "npx tsc --noEmit";
  try {
    const pkg = require(path.join(CLIENT_DIR, "package.json"));
    if (pkg.scripts && pkg.scripts.check) cmd = "npm run check";
  } catch (_) {}
  try {
    execSync(cmd, { cwd: CLIENT_DIR, stdio: "inherit" });
    console.log("✅ TypeScript OK\n");
    return true;
  } catch (e) {
    console.error("❌ TypeScript check ÉCHOUÉ\n");
    return false;
  }
}

function runScript(name) {
  console.log(`\n🚀 Exécution de ${name}...`);
  try {
    execSync(`node ${name}`, { cwd: ROOT, stdio: "inherit" });
    return true;
  } catch (e) {
    console.error(`❌ ${name} a échoué`);
    return false;
  }
}

console.log("=== ORCHESTRATEUR PATCH-ALL ===");
console.log("CWD:", ROOT);

const steps = [
  { script: "patch-seo.cjs", check: true },
  { script: "patch-pwa.cjs", check: true },
  { script: "patch-admin-ui.cjs", check: true },
];

for (const step of steps) {
  if (!runScript(step.script)) {
    console.error("\n⛔ Arrêt. Corrige l'erreur et relance patch-all.cjs.");
    process.exit(1);
  }
  if (step.check && !runCheck()) {
    console.error("\n⛔ Arrêt. Corrige les erreurs TypeScript et relance.");
    process.exit(1);
  }
}

console.log("\n🎉 TOUS LES PATCHES SONT APPLIQUÉS AVEC SUCCÈS !");
console.log("Les fichiers .bak-* te permettent de rollback si besoin.");
process.exit(0);
