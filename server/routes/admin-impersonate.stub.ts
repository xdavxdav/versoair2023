// === STUB BACKEND IMPERSONATION ===
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
