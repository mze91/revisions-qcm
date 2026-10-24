# Révisions QCM — appli de la sœur d'Issa

Appli web installable (PWA) d'entraînement aux QCM pour une étudiante en santé. Les QCM viennent **uniquement
de ses cours**. Issa parle français et n'est pas développeur : réponds en français simple, sans jargon.

## Fonctionnement
- **Génération côté Issa, sans API** : il dépose un cours dans `cours/`, lance `/generer-qcm` (skill du projet)
  → `packs/<matiere>/<chapitre>.qcm.json`, vérifié par `outils/verifier-pack.mjs` (chaque extrait cité doit
  exister mot pour mot dans `travail/<matiere>/<chapitre>/texte.md`).
- **Côté téléphone** : elle importe le fichier (Mes cours → Importer). Données dans IndexedDB (Dexie), rien sur
  un serveur. Sauvegarde = fichier JSON exporté/importé.
- `cours/`, `travail/` et `packs/` sont privés (ignorés par git) : ne jamais les publier.

## Code
- Vite + React + TypeScript, `vite-plugin-pwa`, Dexie (`src/db.ts`). Pas de routeur : onglets dans `src/App.tsx`.
- Écrans : `src/screens/` (Accueil = menu + stats, Reviser = « S'entraîner », Session, Erreurs, Cours,
  ChoixChapitres). Composants visuels (icônes SVG, anneau, pastille) dans `src/ui.tsx` ; statistiques (série,
  réussite, maîtrise par chapitre) et couleur par matière dans `src/stats.ts`.
- Design : police arrondie système, boutons « en relief », retour vert/rouge en bas d'écran, mode sombre.
  Couleurs dans les variables CSS en haut de `src/styles.css`.
- Règles métier : `src/correction.ts` (discordances, barème, « Mes erreurs »), `src/importation.ts` (import,
  réimport sans perte d'historique, sauvegarde).
- Format des fichiers de QCM : `docs/FORMAT-PACK.md`. Feuille de route : `docs/PLAN.md`.
- Règle « Mes erreurs » : tout QCM avec au moins une discordance y entre ; il n'en sort que s'il est réussi
  depuis l'onglet « Mes erreurs ».
- Changer le schéma Dexie = nouvelle `db.version(n)` (ne jamais modifier une version déjà publiée).

## Commandes
- `npm run dev` (serveur local, accessible du téléphone sur le même Wi-Fi), `npm run build`.
- Consulter la doc à jour avec Context7 avant d'utiliser une bibliothèque.
