# Révisions QCM — appli de la sœur d'Issa

Appli web installable (PWA) d'entraînement aux QCM pour une étudiante en santé. Les QCM viennent **uniquement
de ses cours**. Issa parle français et n'est pas développeur : réponds en français simple, sans jargon.

## Fonctionnement
- Les cours viennent des fiches du Tutorat Paris XII (LAS), rangées dans `cours/UE1…UE4`.
- **Génération côté Issa, sans API** : `/generer-qcm` (skill du projet) → `packs/<matiere>/<fiche>.qcm.json`,
  vérifié par `outils/verifier-pack.mjs` (chaque extrait cité doit exister mot pour mot dans
  `travail/<matiere>/<fiche>/texte.md`). Les QCM d'entraînement du tutorat sont repris en `origine: "annale"`.
- **Annales** (épreuves blanches de la sœur, `annales/<UE>/`) : une épreuve par fichier dans
  `travail/annales/<ue>/` (consignes `CONSIGNES.md`, relecture `RELECTURE.md`, rapports `*.rapport.md`), champ
  `annee` (« CB1 2023-2024 ») et `source.fiche` quand un passage vient d'une autre fiche ;
  `node outils/ajouter-annales.mjs <ue>` les range dans les packs (relançable).
- **Publication** : `node outils/publier-contenu.mjs` chiffre (AES-GCM, clé tirée du code `.code-acces` par
  PBKDF2) les matières listées dans `outils/contenu-publie.json` → `public/contenu/*.bin` + `index.json`,
  puis commit + push (GitHub Pages).
- **Côté téléphone** : AUCUN import (décision d'Issa). Au premier lancement, elle tape le code d'accès ; ensuite
  `src/contenu.ts` télécharge et met à jour les cours à chaque ouverture. Le contenu publié fait foi : ce qui
  n'y est plus est retiré. Données et progression dans IndexedDB (Dexie).
- **Règle absolue d'Issa** : 100 % du contenu vient des fiches et des annales de sa sœur. Pas d'Internet, pas
  d'invention, pas de recherche pour écrire ou corriger une question.
- La publication rend aussi les pages des fiches en images (cache `travail/_pages/`), chiffrées dans
  `public/contenu/pages/`, et repère chaque extrait sur sa page (`outils/zones.mjs`) pour le surligner.
  Chiffrement déterministe : republier sans changement ne modifie aucun fichier.
- `cours/`, `travail/`, `packs/` et `.code-acces` sont privés (ignorés par git) : ne jamais les publier.

## Code
- Vite + React + TypeScript, `vite-plugin-pwa`, Dexie (`src/db.ts`). Pas de routeur : onglets dans `src/App.tsx`.
- Écrans : `src/screens/` (Code = code d'accès, Accueil = menu + stats + révision du jour, Reviser =
  « S'entraîner », Session, Question = affichage partagé d'une question et de sa correction, Erreurs, Cours =
  parcours UE > partie > fiche, Fiche = lire / réviser / erreurs, Examen = préparation + copie + résultat,
  ChoixChapitres, Attente). Navigation : pile d'écrans dans `src/App.tsx`. Lecteur de cours : `src/lecteur.tsx`
  (ouvrable de partout avec `useOuvrirCours`). Examen blanc : `src/examen.ts`. Composants visuels (icônes SVG, anneau, pastille) dans `src/ui.tsx` ; statistiques (série,
  réussite, maîtrise par chapitre) et couleur par matière dans `src/stats.ts`.
- Design : police arrondie système, boutons « en relief », retour vert/rouge en bas d'écran, mode sombre.
  Couleurs dans les variables CSS en haut de `src/styles.css`.
- Règles métier : `src/correction.ts` (discordances, barème, « Mes erreurs », préparation des séries),
  `src/importation.ts` (enregistrement d'une matière publiée sans perte d'historique), `src/contenu.ts`
  (code d'accès, déchiffrement, synchronisation).
- Format des fichiers de QCM : `docs/FORMAT-PACK.md`. Feuille de route : `docs/PLAN.md`.
- Règle « Mes erreurs » : tout QCM avec au moins une discordance y entre ; il n'en sort que s'il est réussi
  depuis l'onglet « Mes erreurs ».
- Changer le schéma Dexie = nouvelle `db.version(n)` (ne jamais modifier une version déjà publiée).

## Commandes
- `npm run dev` (serveur local, accessible du téléphone sur le même Wi-Fi), `npm run build`.
- Consulter la doc à jour avec Context7 avant d'utiliser une bibliothèque.
