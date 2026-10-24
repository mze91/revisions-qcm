# Feuille de route

## Étape 1 — Première version ✅ (24/10/2026)
- Appli installable sur téléphone, données sur l'appareil, sauvegarde dans un fichier.
- Matières et chapitres, import des fichiers de QCM, réimport sans perte d'historique.
- Choix des chapitres, mode entraînement : correction immédiate item par item, explication et extrait du cours.
- Barème médecine par défaut (1 / 0,5 / 0,2 / 0 selon les discordances).
- Onglet « Mes erreurs » : entrée automatique, sortie seulement après réussite depuis l'onglet.
- Côté Issa : commande `/generer-qcm` (cours PDF, Word, PowerPoint, photos, manuscrit) + vérificateur.

## Étape 2 — Mode examen
- Modalités par matière (`matiere.modalites` dans le pack, modifiables dans l'appli) : durée, nombre de
  questions, barème (discordances, tout-ou-rien, points négatifs), type de QCM.
- Examen chronométré, tirage selon les modalités, aucune correction avant la fin, puis correction complète
  et note. Les QCM ratés vont dans « Mes erreurs ».
- Sauvegarde de l'examen en cours (si l'appli se ferme).

## Étape 3 — Annales
- Issa dépose les photos ou scans dans `annales/<matiere>/`. Claude les retranscrit en QCM
  (`origine: "annale"`), avec la correction officielle si elle existe. Sinon, la correction est justifiée par
  le cours, et les items que le cours ne permet pas de trancher sont signalés.
- La génération lit les annales de la matière pour imiter leur style : tournures, pièges fréquents, niveau
  de détail, proportion de bonnes réponses.
- Filtre « annales seulement » dans l'appli.

## Étape 4 — QCM à schéma
- Claude extrait le schéma du cours (image de la page recadrée), place des numéros sur les légendes, et
  l'enregistre dans le pack (`questions[].schema`, image intégrée).
- Items du type « 3 = ventricule gauche », affichage zoomable au-dessus des items.

## Étape 5 — Plus tard, si besoin
- Mise à jour sans envoyer de fichier : catalogue de packs hébergé en privé.
- Synchronisation téléphone ↔ ordinateur (compte).
- Statistiques par chapitre (taux de réussite, chapitres à revoir).
