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

## À venir
1. **Annales** (quand ta sœur les envoie) :
   - les déposer dans `annales/<UE>/` (photos, scans ou PDF) ;
   - Claude les retranscrit fidèlement (`origine: "annale"`, `annee`), avec la grille officielle si elle
     existe ;
   - chaque question va dans la fiche de cours qui la justifie, et chaque item cite cette fiche mot pour mot ;
     un item que le cours ne permet pas de trancher est signalé, jamais inventé ;
   - dans l'examen blanc, ajouter le choix « Annales seules », et caler les réglages par défaut (durée,
     barème) sur les vraies modalités lues dans les annales.
2. **QCM à schéma** : schéma légendé par des numéros, affiché au-dessus des items.
3. Plus tard, si besoin : statistiques détaillées, synchronisation entre plusieurs appareils.
