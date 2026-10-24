---
name: generer-qcm
description: Transforme un cours (PDF, Word, PowerPoint, photos, notes manuscrites) déposé dans cours/ en fichier de QCM type annales de médecine pour l'appli de révision, en s'appuyant uniquement sur le contenu du cours, puis le vérifie. À utiliser quand Issa dit « génère les QCM de ce cours », « nouveau cours », « /generer-qcm », ou dépose un fichier dans cours/.
---

# Générer les QCM d'un cours

Ta mission : écrire des QCM fidèles **au cours seulement**. La sœur d'Issa révise ses examens de médecine
avec ces QCM. Une question qui s'appuie sur une connaissance extérieure au cours, même exacte, est une faute.
Parle à Issa en français simple.

## 1. Repérer le cours

- Les cours sont dans `cours/` (souvent `cours/<Matière>/<fichier>`). Si Issa ne précise pas lequel, liste les
  fichiers qui n'ont pas encore de pack dans `packs/` et demande-lui.
- Choisis les identifiants : `matiere-id` et `chapitre-id`, en minuscules avec des tirets (ex. `physiologie`,
  `cycle-cardiaque`). Réutilise le `matiere-id` des packs existants de la même matière (`ls packs/`).
  Choisis aussi le nom lisible du chapitre et sa place (`ordre`). Demande à Issa si tu as un doute.

## 2. Obtenir le texte du cours

```bash
node outils/extraire-texte.mjs "cours/<…>/<fichier>" travail/<matiere-id>/<chapitre-id>
```

- PDF, Word, PowerPoint, .txt et .md : le texte est extrait automatiquement dans `texte.md`.
- **Photos, scans, notes manuscrites**, ou un PDF scanné (le script prévient « peu de texte ») : ouvre
  chaque image avec Read et **transcris fidèlement** dans `travail/<matiere-id>/<chapitre-id>/texte.md`, avec
  les repères `=== Page N ===`. Ne corrige pas le fond et ne complète rien. Écris `[illisible]` quand tu ne
  peux pas lire. S'il y en a beaucoup, montre à Issa les passages douteux avant de générer.
- Lis **tout** `texte.md` avant d'écrire la moindre question.

## 3. Écrire les QCM

Écris `packs/<matiere-id>/<chapitre-id>.qcm.json` au format décrit dans `docs/FORMAT-PACK.md`.

**Quantité** : environ 1 QCM par demi-page de cours dense, au moins 10, au plus 60 par chapitre (sauf
demande d'Issa). Couvre tout le chapitre, pas seulement le début.

**Style annales de médecine (PASS/LAS)**
- 5 items, de A à E, `"type": "multiple"` : de 1 à 5 items vrais. **Varie** le nombre de vrais d'une question
  à l'autre (souvent 2 ou 3, parfois 1, rarement 5) et leur position.
- Énoncé court et neutre, par exemple : « À propos de … , quelle(s) est (sont) la (les) proposition(s)
  exacte(s) ? ». Le contexte peut aussi être donné en une phrase.
- Chaque item est une affirmation complète qui se comprend seule et teste **une** notion précise du cours :
  définition, valeur, chronologie, localisation, mécanisme, cause et conséquence, exception.
- Items faux : prends une affirmation du cours et modifie-la de façon plausible (inverser deux éléments,
  changer une valeur, une localisation, un sens de variation, une cause, oublier une exception). Pas d'item
  absurde, pas de piège sur l'orthographe, pas de double négation. Pas de « toujours » ni de « jamais »,
  sauf si le cours les emploie.
- Pas d'item du type « toutes les réponses sont justes » ou « aucune ».
- Une question ne doit pas donner la réponse d'une autre.

**Uniquement le cours**
- Chaque item, vrai ou faux, doit pouvoir être tranché **avec le cours seul**. Si le cours ne permet pas de
  dire qu'une affirmation est fausse, ne l'utilise pas.
- `explication` : commence par « Vrai. » ou « Faux. ». Pour un item faux, dis ce que le cours dit vraiment,
  en reprenant ses mots. N'ajoute aucune information extérieure.
- `source.extrait` : **copie mot pour mot** le passage le plus court de `texte.md` qui justifie l'item (une
  ou deux phrases, 300 caractères au plus). Garde les accents. Utilise « […] » pour sauter un passage. Ne
  reformule jamais l'extrait. Indique aussi `source.page`.

**Identifiants** : `q001`, `q002`… Si le pack existe déjà, garde les mêmes `id` pour les questions conservées
et numérote les nouvelles à la suite. Sinon, ta sœur perdrait son historique et ses erreurs.

## 4. Vérifier

```bash
node outils/verifier-pack.mjs packs/<matiere-id>/<chapitre-id>.qcm.json --corriger-pages
```

Corrige jusqu'à obtenir « ✓ Fichier valide ». Un extrait « INTROUVABLE » veut dire que tu l'as reformulé :
recopie-le exactement depuis `texte.md`. Prends aussi au sérieux les avertissements (répartition des bonnes
réponses, item toujours vrai à la même lettre).

Relis ensuite chaque question en te demandant :
1. L'extrait suffit-il à trancher l'item ?
2. Un bon étudiant pourrait-il hésiter à cause d'une formulation ambiguë ?
3. Y a-t-il une seule lecture possible ?

Corrige ou supprime les items douteux.

## 5. Livrer

Donne à Issa :
- le chemin du fichier ;
- le nombre de QCM ;
- les éventuels passages du cours illisibles ou ambigus.

Rappelle-lui comment l'envoyer : AirDrop (ou WhatsApp, mail) vers le téléphone de sa sœur, « Enregistrer dans
Fichiers », puis dans l'appli : **Mes cours → Importer un fichier**.
