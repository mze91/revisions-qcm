# Feuille de route

Règle absolue : 100 % du contenu vient des fiches du tutorat et des annales de la sœur d'Issa.
Pas d'Internet, pas d'invention. Chaque item cite le cours mot pour mot (vérifié par l'outil).

## Fait
- **Première version** (24/10/2026) : entraînement corrigé item par item, choix des fiches, « Mes erreurs ».
- **Nouveau design** (24/10/2026) : accueil avec statistiques, 4 onglets, mode sombre.
- **Cours intégrés** (28/10/2026) : plus aucun import, QCM chiffrés (code d'accès), synchronisation
  automatique. UE1 : 67 fiches, 902 QCM. UE2 : 30 fiches, 446 QCM.
- **Lecteur de cours** (28/10/2026) : les vraies pages des fiches (schémas, tableaux) sont chiffrées dans
  l'appli. Chaque correction a un bouton « Voir dans le cours » qui ouvre la bonne page et surligne le passage
  (environ 95 % des passages sont repérés ; sinon, la page s'ouvre sans surlignage).
- **Page par fiche** : lire la fiche, réviser ses QCM, reprendre ses erreurs.
- **Examen blanc** : choix de l'UE et des parties, nombre de QCM, durée, barème (discordances ou tout ou
  rien), chrono qui continue même si l'appli est fermée, QCM « à revoir », grille de navigation, correction à
  la fin, note sur 20 et détail par partie, historique des examens.
- **Révision du jour** : répétition espacée, à partir de son historique (raté → 1 jour ; réussi 1 à 5 fois de
  suite → 2, 5, 12, 30, 60 jours).
- **UE3 et UE4** (28/10/2026) : UE3 45 fiches, 672 QCM ; UE4 44 fiches, 706 QCM. Chaque QCM a été relu par un
  second assistant qui ne l'avait pas écrit (consignes `travail/RELECTURE.md`) : items ambigus ou hors fiche
  corrigés, QCM du tutorat dont la grille contredit la fiche écartés. Total : 186 fiches, 2 726 QCM.
- **Annales** (30/10/2026, reçues dans `annales/<UE>/`, privé) : environ 80 épreuves blanches retranscrites
  fidèlement (grille officielle, erratas appliqués ; consignes `travail/annales/CONSIGNES.md`), chacune relue
  par un second assistant (`travail/annales/RELECTURE.md`). Un QCM n'est gardé que si chaque proposition est
  tranchée mot pour mot par une fiche (pas par déduction) et si la réponse
  officielle est d'accord avec la fiche. 1 055 QCM gardés (UE1 386, UE2 204, UE3 311, UE4 154), rangés dans la
  fiche qui les justifie par `node outils/ajouter-annales.mjs <ue>` (`source.fiche` quand un passage vient
  d'une autre fiche). Étiquette « Annale <épreuve> <année> », choix « Annales » dans l'examen blanc. Erreurs
  probables des fiches et des corrections : `travail/annales/ERREURS-A-SIGNALER.md`. Total : 3 781 QCM.

## À venir
1. **QCM à schéma** : schéma légendé par des numéros, affiché au-dessus des items.
2. Plus tard, si besoin : statistiques détaillées, synchronisation entre plusieurs appareils.
