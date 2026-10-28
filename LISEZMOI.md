# Révisions QCM — mode d'emploi pour Issa

## Installer l'appli sur l'iPhone de ta sœur
1. Ouvre **https://mze91.github.io/revisions-qcm/** dans **Safari**.
2. Touche le bouton Partager (le carré avec une flèche), puis **« Sur l'écran d'accueil »**.
3. Ouvre l'appli depuis son icône et tape le **code d'accès**. Il est dans le fichier `.code-acces` de ce
   dossier : demande-le à Claude si besoin. Elle ne le tape qu'une seule fois.

Ensuite, elle n'a plus rien à faire. Ses cours se mettent à jour tout seuls à chaque ouverture de l'appli
(avec Internet), et l'appli marche aussi hors ligne.

## Ajouter des cours (c'est toi qui le fais)
1. Dépose les fiches dans `cours/<UE>/` (PDF, Word, PowerPoint, photos…).
2. Dans une session Claude Code ouverte sur ce dossier, demande : « génère les QCM de l'UE2 » (ou d'une
   fiche précise). Claude suit la méthode `/generer-qcm` : il reprend les QCM d'entraînement du tutorat, en
   écrit d'autres à partir du cours, et vérifie que chaque correction cite le cours mot pour mot.
3. Demande ensuite à Claude de **publier** : il ajoute l'UE à `outils/contenu-publie.json`, lance
   `node outils/publier-contenu.mjs` (qui chiffre les QCM) et envoie la mise à jour en ligne.
   Quelques minutes plus tard, les nouveaux cours apparaissent sur le téléphone de ta sœur.

## Confidentialité
- Les fiches du tutorat (`cours/`), le texte extrait (`travail/`), les QCM en clair (`packs/`) et le code
  (`.code-acces`) restent sur ce disque : ils ne sont jamais envoyés sur GitHub.
- En ligne, il n'y a que des QCM **chiffrés**, illisibles sans le code.
- Pour changer le code (si quelqu'un d'autre l'a eu) : `node outils/publier-contenu.mjs --nouveau-code`,
  puis publier. L'appli redemandera le nouveau code à ta sœur, sans rien perdre de sa progression.
