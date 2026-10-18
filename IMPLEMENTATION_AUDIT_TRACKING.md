# Plan d’implémentation globale + audit tracking

## 1) Résumé exécutif

Le site est techniquement en ligne et les routes de portail / auth sont structurées, mais le produit n’est pas encore “vivant” car il manque des données réelles, des profils publiés et des parcours complets alimentés par des utilisateurs réels.

### Vérification en production

- La racine du site répond en HTTP 200.
- L’API publique du répertoire artisan répond en HTTP 200.
- La réponse actuelle est :
  {
  "success": true,
  "data": [],
  "count": 0
  }

Cela confirme que le répertoire n’est pas cassé : il est simplement vide pour le moment.

---

## 2) Diagnostic actuel

### Ce qui est déjà en place

- Authentification fonctionnelle
- Sélection multiple de compte
- Sélection multiple de portail
- Routage par rôle / famille de compte
- Pages publiques existantes
- Modèle de portails multi-rôles
- Structure de dashboards et de navigation

### Ce qui manque encore pour rendre le produit utile

- Profils artisan publiés
- Profils artistes réels
- Profils business réels
- Membre de communauté actif
- Contenu public exploitable
- Workflow de publication / validation
- Données de démonstration suffisamment riches pour illustrer le produit

---

## 3) Objectif global

Transformer la plateforme de “shell fonctionnel” en “écosystème vivant et crédible” avec :

- des profils réels
- des parcours d’inscription complets
- des pages publiques remplies
- des dashboards cohérents
- une validation claire des comptes et contenus

---

## 4) Plan d’implémentation par phases

### Phase 0 — Audit de base et cadrage

Délai : 1 à 2 jours

Objectifs :

- confirmer les flux existants
- documenter les rôles et comptes
- valider les pages actives
- identifier les écarts entre ce qui est prévu et ce qui est réellement exploitable

Livrables :

- matrice des portails
- cartographie des pages actives
- cartographie des pages vides / placeholders
- liste des risques fonctionnels

Critère de validation :

- chaque rôle principal a une route claire, un dashboard clair et une raison d’être claire.

---

### Phase 1 — Remplir les profils publics critiques

Délai : 3 à 5 jours

Objectif :

- publier uniquement des profils réels fournis ou approuvés par leur propriétaire et vérifiés avant publication

Priorité 1 : Artisans

- recueillir des profils artisan authentiques avec catégorie, spécialité, description, localisation et photo autorisée
- confirmer l’exactitude et l’autorisation de publication avant activation

Priorité 2 : Artistes

- recueillir des profils artistiques authentiques et une mini-présentation approuvée

Priorité 3 : Business / entreprises

- recueillir des profils de business/services authentiques et approuvés

Priorité 4 : Community

- ne publier aucun profil communautaire de démonstration comme s’il s’agissait d’un utilisateur réel

Livrables :

- fixtures de test isolées des surfaces publiques
- profils réels, vérifiés et autorisés avant toute publication
- premier niveau de présence publique fondé sur des éléments vérifiables

Critère de validation :

- chaque carte publique correspond à un profil réel vérifié et autorisé; ne pas remplir la page avec des données fictives.

---

### Phase 2 — Rendre les parcours publics exploitables

Délai : 3 à 4 jours

Objectif :

- faire que les utilisateurs trouvent quelque chose d’utile immédiatement

A faire :

- page artisans active et exploitable
- page artistes active
- page communautés active
- page business / services active
- navigation publique cohérente
- filtres / catégories fonctionnels

Livrables :

- landing pages remplies
- liste de résultats exploitable
- parcours de découverte cohérents

Critère de validation :

- un visiteur peut parcourir le site et voir des profils et contenus réels sans page vide.

---

### Phase 3 — Finaliser les workflows de compte et d’authentification

Délai : 3 à 5 jours

Objectif :

- sécuriser les comptes et leur comportement

A faire :

- validation du flux de création de compte
- validation du choix de portail
- validation du login multi-compte
- validation du dashboard correct selon le rôle
- validation de la redirection après connexion

Livrables :

- parcours d’inscription fonctionnels
- parcours de connexion cohérents
- redirections correctes selon le rôle

Critère de validation :

- un utilisateur connecté arrive toujours au bon portail et au bon dashboard.

---

### Phase 4 — Compléter les workflows métiers par portail

Délai : 5 à 7 jours

Objectif :

- rendre chaque type de compte utile dans son domaine

Portails à compléter :

- Artisan
- Artist
- Community
- Business
- Streamer / listener
- Contractor / admin-related flows

A faire :

- formulaire de profil adapté
- section portfolio / services / contenu
- gestion des données liées au compte
- affichage public et privé cohérent

Critère de validation :

- chaque rôle a un parcours opérationnel complet, pas seulement un écran de bienvenue.

---

### Phase 5 — Validation, QA, polish, préparation de la mise en ligne

Délai : 2 à 4 jours

Objectif :

- stabiliser le produit avant activation plus large

A faire :

- tests de parcours complet
- QA fonctionnelle
- QA visuelle
- validations sur les pages publiques
- validations sur les dashboards
- contrôle de cohérence du contenu

Critère de validation :

- le site est crédible, visible, stable et prêt pour une première vague d’utilisateurs réels.

---

## 5) Cadre d’audit tracking

### Tableau de suivi

| Zone                             | Statut                |   Priorité | Propriétaire | Date cible | Détails                                      |
| -------------------------------- | --------------------- | ---------: | ------------ | ---------- | -------------------------------------------- |
| Audit global du site             | En cours              | Très haute | Projet       | J1         | Vérification du système actuel               |
| Portails / rôles / auth          | Terminé partiellement | Très haute | Projet       | J2         | Structure utile, besoin de validation finale |
| Artisans / directory public      | Bloqué                | Très haute | Produit      | —          | Obtenir des profils réels vérifiés et autorisés; aucune fiche synthétique publique |
| Artistes                         | Bloqué                |      Haute | Produit      | —          | Publier uniquement des profils authentiques et approuvés |
| Business                         | Bloqué                |      Haute | Produit      | —          | Publier uniquement des profils/services authentiques et approuvés |
| Community                        | Bloqué                |    Moyenne | Produit      | —          | Aucun compte de démonstration présenté comme utilisateur réel |
| Dashboards par rôle              | En cours              | Très haute | Front / Back | J5         | Vérifier cohérence de navigation             |
| QA fonctionnelle                 | À démarrer            | Très haute | QA           | J6         | Valider les parcours utilisateurs            |
| Publication / validation         | À démarrer            |      Haute | Admin        | J7         | Mettre en place le workflow                  |
| Préparation de la première vague | À démarrer            |      Haute | Produit      | J7+        | Réseau réel / mise en service                |

---

## 6) Critères de succès de la première vague

La première vague est réussie si :

- chaque fiche publique correspond à un profil réel, vérifié et autorisé
- aucune donnée de test n’est visible dans les surfaces publiques
- les portails de comptes fonctionnent correctement
- les dashboards conduisent vers le bon espace
- les parcours d’inscription sont crédibles
- le produit paraît cohérent et exploitable par des utilisateurs réels

---

## 7) Checklist immédiate de démarrage

### À faire maintenant

- [ ] Finaliser la cartographie des rôles et portails
- [ ] Confirmer les pages actives vs placeholders
- [ ] Recueillir et vérifier les profils artisan autorisés
- [ ] Publier uniquement les profils artisan vérifiés et approuvés
- [ ] Vérifier le rendu de la directory
- [ ] Tester le dashboard utilisateur lié au profil
- [ ] Recueillir l’autorisation et vérifier les profils artiste / business / community
- [ ] Valider la navigation entre pages publiques et dashboards
- [ ] Définir le workflow admin de publication
- [ ] Préparer la première QA fonctionnelle

---

## 8) Prochaine décision importante

Le point clé est le suivant :

Le produit ne doit pas être considéré comme “fini” tant qu’il n’a pas un minimum de contenu public réel et un minimum de parcours utiles visibles pour les utilisateurs.

Le vrai moteur de crédibilité est le contenu et les profils publiés, pas seulement les composants UI.

---

## 9) Recommandation de mise en œuvre

### Priorité absolue

1. Artisan directory + profils publiés
2. Dashboard utilisateur cohérent
3. Artistes et business profiles
4. Community + content public
5. QA et polish

### Ce qu’il faut éviter

- Ajouter trop de nouvelles features avant d’avoir du contenu réel
- Construire des pages sans data
- Développer des parcours premium avant l’activation du cœur de plateforme
- Travailler sans audit / suivi de progression

---

## 10) Conclusion

La copie locale ne permet pas de conclure que le site est prêt pour le passage de la “version technique” à la “version utile”. La priorité est de vérifier les affirmations et données réellement visibles, puis de valider les parcours et le déploiement avec des preuves. Aucun profil synthétique ne doit être publié pour donner une impression d’activité.

---

## 11) État de progression actuel

- Audit technique : en cours
- Rôles / portails : structure vérifiée
- Répertoire public : un relevé live antérieur a renvoyé 9 fiches de Toronto avec des signatures de données substitutives; provenance et exactitude non vérifiées
- Public content : à alimenter
- Publication / validation : à définir
- QA globale : à planifier

L’objectif de cette première implémentation globale est de rendre le produit crédible, visible et exploitable par de vrais utilisateurs.

## 12) Mise à jour des portes de lancement — preuves locales et limites

Cette mise à jour supplante les anciennes affirmations de ce document lorsqu’elles décrivent des profils ou des parcours comme vérifiés. Elle ne prouve pas que les correctifs locaux sont déployés. Le P2 ci-dessous désigne l’audit des affirmations publiques demandé pour le lancement; il ne correspond pas au P2 de maintenance du dépôt dans le Master Production Remediation Plan.

| Porte | Statut | Vérification et travail restant |
|---|---|---|
| P2 — Affirmations publiques et crédibilité | **En cours** | Plusieurs affirmations locales de prix/essai, de démonstration, de classement et de statistiques simulées ont été retirées ou masquées. L’audit complet des pages, des deux langues et du mobile reste à faire; aucun correctif local n’est confirmé en production. |
| P4 — Offre et paiements | **Partiel; production bloquée** | L’offre reste une demande de renseignements pour une inscription au répertoire, sans promesse de prix, d’essai ou de conditions payantes. Les parcours d’abonnement/paiement sont fermés par défaut localement; achats, remboursements et webhooks de production ne sont pas testés. |
| P5 — Messages et compte | **Bloqué** | Le code local ne retourne plus un succès d’envoi si SMTP est absent ou si le destinataire refuse le message; les champs HTML sont échappés. Réception dans une boîte surveillée, réponse, signup/login, vérification, réinitialisation et erreurs doivent être testés avec des comptes autorisés. |
| P6 — Connexions tierces et promotion | **Bloqué** | Les options OAuth sont localement filtrées par autorisation et configuration. Fournisseurs choisis, applications/callbacks/secrets de production, consentement, unlinking, liens de profils, contenus bilingues et profils externes gérés par le propriétaire restent à confirmer. |
| P8 — Répertoire et recherche IA | **Bloqué** | Le relevé de recherche Toronto a retourné 9 fiches, toutes avec un site en domaine `example.com` et un téléphone au format `+1-555`, signatures cohérentes avec des fixtures synthétiques; la provenance n’est pas établie. Aucune ligne de production n’a été modifiée. Les lectures publiques locales filtrent désormais les fiches non vérifiées et ces signatures; il reste à déployer sous autorisation, à tester sur la vraie base et à vérifier indépendamment des fiches Toronto. Ne pas semer d’exemples de grandes marques. |
| P7 — Go/no-go | **Bloqué** | Décision interdite avant preuves pour les affirmations, l’offre, le contact, les intégrations, les fiches et la release, puis approbation explicite du propriétaire. |

### Vérification live complémentaire — Marketplace, 8 octobre 2026

La page publique `/marketplace` affiche `0°, 0°`, `Active Users: 0`, `Coverage Areas: 0%`, aucun artiste inscrit, zéro stream et zéro artiste actif. Cette vérification de navigateur ne prouve pas si les zéros sont des données réelles ou des valeurs par défaut. Le panneau de localisation dans la copie locale utilise `"0"` en remplacement lorsque certaines métriques sont absentes; il faut donc vérifier la source avant de présenter les valeurs comme mesurées. La console du navigateur a aussi signalé une ressource en 401 et des blocages CSP pour le script Klaviyo et une requête de frame. Confirmer si ces intégrations sont attendues; sinon, retirer les requêtes ou revoir la politique après validation de sécurité. En attendant, afficher un état vide/non disponible explicite ou masquer les métriques non vérifiées.

### Limites d’accès et opérations

- Le projet local est sous le dépôt Git parent `/Users/joe` (branche locale `joel`), mais cette copie VersoAir n’est pas un checkout suivi dont le lien à Render est démontré. Le dépôt, la branche et le SHA déployés restent à vérifier dans Render.
- `/api/health` a indiqué API/base de données accessibles lors du contrôle; `/api/ai/status` a indiqué `fallback` / `rule-based`. L’audit documente Ollama, Groq et les modes de secours; ce statut ne prouve pas qu’Ollama fonctionne en production.
- Aucun déploiement, changement de configuration de production, envoi de contact, achat, création de compte ou mutation de données de production n’a été effectué. Les dépendances locales et la vérification TypeScript/build restent à vérifier.
