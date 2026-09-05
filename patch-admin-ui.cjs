#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const CLIENT_DIR = path.join(ROOT, "client");
const SRC_DIR = path.join(CLIENT_DIR, "src");

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

function findAdminDashboard() {
  const candidates = [
    path.join(SRC_DIR, "pages", "Admin.tsx"),
    path.join(SRC_DIR, "pages", "AdminDashboard.tsx"),
    path.join(SRC_DIR, "pages", "admin", "Dashboard.tsx"),
    path.join(SRC_DIR, "app", "Admin.tsx"),
    path.join(SRC_DIR, "components", "admin", "AdminDashboard.tsx"),
    path.join(SRC_DIR, "views", "Admin.tsx"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;

  function search(dir) {
    if (!fs.existsSync(dir)) return null;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        const found = search(p);
        if (found) return found;
      } else if (/admin/i.test(e.name) && /\.tsx?$/.test(e.name)) {
        return p;
      }
    }
    return null;
  }
  return search(SRC_DIR);
}

function getRelativeImport(fromFile, toFile) {
  let rel = path
    .relative(path.dirname(fromFile), toFile)
    .replace(/\\/g, "/")
    .replace(/\.tsx$/, "");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

function createImpersonatePanel() {
  const dir = path.join(SRC_DIR, "components", "admin");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, "ImpersonatePanel.tsx");
  backup(file);

  const code = `import { useState } from 'react';

export default function ImpersonatePanel() {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleImpersonate() {
    if (!userId.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(\`/api/admin/impersonate/\${userId}\`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      const data = await res.json();
      setMessage(\`Impersonation active pour \${data.email || userId}\`);
      window.location.reload();
    } catch (err: any) {
      setMessage(\`Erreur: \${err.message}\`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    try {
      await fetch('/api/admin/stop-impersonation', {
        method: 'POST',
        credentials: 'include'
      });
      window.location.reload();
    } catch (err: any) {
      setMessage(\`Erreur: \${err.message}\`);
    }
  }

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: 8, marginTop: '1rem' }}>
      <h3>Impersonation utilisateur</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          placeholder="ID ou email utilisateur"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button onClick={handleImpersonate} disabled={loading}>
          {loading ? '...' : 'Impersonate'}
        </button>
        <button onClick={handleStop} disabled={loading}>
          Stop
        </button>
      </div>
      {message && <p style={{ color: message.startsWith('Erreur') ? 'red' : 'green' }}>{message}</p>}
    </div>
  );
}
`;
  write(file, code);
  console.log("ImpersonatePanel.tsx créé");
  return file;
}

function createBackendStub() {
  const serverDir = path.join(ROOT, "server", "routes");
  if (!fs.existsSync(serverDir)) {
    console.log("Dossier server/routes non trouvé, stub backend non créé");
    return;
  }
  const file = path.join(serverDir, "admin-impersonate.stub.ts");
  if (fs.existsSync(file)) {
    console.log("Stub backend déjà existant");
    return;
  }
  const stub = `// === STUB BACKEND IMPERSONATION ===
// Copie ce contenu dans ton fichier de routes admin et branche
// les endpoints sur /api/admin/impersonate/:userId et /api/admin/stop-impersonation

import { Router, Request, Response } from 'express';
// import { requireAdmin } from '../middleware/auth'; // adapte selon ton projet

const router = Router();

// POST /api/admin/impersonate/:userId
router.post('/impersonate/:userId', /* requireAdmin, */ async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    // 1. Verifier que l'admin est authentifie
    // 2. Recuperer l'utilisateur cible
    // 3. Sauvegarder l'admin original dans req.session.adminId
    // 4. Remplacer req.session.userId par userId
    // 5. Retourner les infos de l'utilisateur
    res.json({ id: userId, email: 'user@example.com', name: 'Utilisateur' });
  } catch (err) {
    res.status(500).json({ error: 'Impersonation echouee' });
  }
});

// POST /api/admin/stop-impersonation
router.post('/stop-impersonation', /* requireAdmin, */ async (req: Request, res: Response) => {
  try {
    // 1. Restaurer req.session.userId depuis req.session.adminId
    // 2. Supprimer req.session.adminId
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
`;
  write(file, stub);
  console.log("admin-impersonate.stub.ts créé dans server/routes/");
}

function injectIntoDashboard(dashboardPath, panelPath) {
  backup(dashboardPath);
  let content = read(dashboardPath);

  if (content.includes("ImpersonatePanel")) {
    console.log("ImpersonatePanel déjà injecté");
    return;
  }

  const relPath = getRelativeImport(dashboardPath, panelPath);
  const importLine = `import ImpersonatePanel from '${relPath}';\n`;

  if (!content.includes("ImpersonatePanel")) {
    content = importLine + content;
  }

  // Injecte avant la balise fermante finale du return
  const lines = content.split("\n");
  let insertLine = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\s*<\/[\w]+>\s*$/.test(lines[i]) || /^\s*<\/>\s*$/.test(lines[i])) {
      insertLine = i;
      break;
    }
  }
  if (insertLine === -1) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/^\s*\);?\s*$/.test(lines[i])) {
        insertLine = i;
        break;
      }
    }
  }

  if (insertLine !== -1) {
    const indent = lines[insertLine].match(/^(\s*)/)[1] + "  ";
    lines.splice(insertLine, 0, indent + "<ImpersonatePanel />");
    content = lines.join("\n");
  }

  write(dashboardPath, content);
  console.log("ImpersonatePanel injecté dans", path.basename(dashboardPath));
}

console.log("=== PATCH ADMIN UI ===");
try {
  const panelPath = createImpersonatePanel();
  const dashboard = findAdminDashboard();
  if (dashboard) {
    injectIntoDashboard(dashboard, panelPath);
  } else {
    console.log("⚠️ Dashboard admin non trouvé automatiquement.");
    console.log(
      "   Injecte manuellement <ImpersonatePanel /> dans ta page admin.",
    );
  }
  createBackendStub();
  console.log("✅ patch-admin-ui.js terminé.\n");
  process.exit(0);
} catch (e) {
  console.error("❌ Erreur:", e.message);
  process.exit(1);
}
