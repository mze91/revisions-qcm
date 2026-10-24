# Révisions QCM — mode d'emploi pour Issa

## Ajouter un cours
1. Dépose le cours de ta sœur dans `cours/<Matière>/`. Formats acceptés : PDF, Word, PowerPoint, photos de
   pages, notes manuscrites.
2. Ouvre une session Claude Code dans ce dossier et écris : **/generer-qcm** (ou « génère les QCM du cours
   … »).
3. Claude lit le cours, écrit les QCM, puis vérifie que chaque correction cite une phrase qui existe vraiment
   dans le cours. Le fichier obtenu est dans `packs/<matière>/<chapitre>.qcm.json`.

## L'envoyer à ta sœur
1. Fais un clic droit sur le fichier, puis Partager → AirDrop vers son iPhone (ou envoie-le par WhatsApp ou
   par mail).
2. Sur son téléphone : « Enregistrer dans Fichiers ».
3. Dans l'appli : **Mes cours → Importer un fichier**, puis choisir le fichier.

Si tu régénères un chapitre, il suffit de réimporter le fichier. Ses erreurs et son historique sont gardés.

## Essayer l'appli sur le Mac
```bash
npm run dev
```
Ensuite, ouvre http://localhost:5173. Le bouton « Essayer avec un cours d'exemple » charge 14 QCM sur le cycle
cardiaque.

## Confidentialité
Les dossiers `cours/`, `travail/` et `packs/` restent sur ce disque : ils ne sont jamais publiés. Sur le
téléphone, tout reste dans l'appli, sans compte ni serveur. Pense à faire une sauvegarde de temps en temps
(Mes cours → Créer une sauvegarde).
