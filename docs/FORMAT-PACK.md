# Format des fichiers de QCM (`.qcm.json`)

Un fichier de QCM contient une matière et un ou plusieurs chapitres. On en fait en général un par chapitre :
`packs/<matiere-id>/<chapitre-id>.qcm.json`. L'appli l'importe depuis l'onglet « Mes cours ».
Si on réimporte un chapitre qui existe déjà, il est mis à jour. Les QCM qui gardent le même `id` gardent leur
historique et leur place dans « Mes erreurs ».

```json
{
  "format": "qcm-revision",
  "version": 1,
  "matiere": { "id": "physiologie", "nom": "Physiologie" },
  "chapitres": [
    {
      "id": "cycle-cardiaque",
      "nom": "Le cycle cardiaque",
      "ordre": 3,
      "source": "Physio_CM3_cycle_cardiaque.pdf",
      "questions": [
        {
          "id": "q001",
          "type": "multiple",
          "origine": "genere",
          "enonce": "À propos de la systole ventriculaire, quelle(s) est (sont) la (les) proposition(s) exacte(s) ?",
          "items": [
            {
              "lettre": "A",
              "texte": "La contraction isovolumique commence à la fermeture des valves auriculo-ventriculaires.",
              "correct": true,
              "explication": "Vrai. Le cours situe le début de la contraction isovolumique à la fermeture des valves mitrale et tricuspide.",
              "source": { "page": 2, "extrait": "La contraction isovolumique débute à la fermeture des valves auriculo-ventriculaires" }
            }
          ]
        }
      ]
    }
  ]
}
```

## Champs

| Champ | Obligatoire | Règle |
|---|---|---|
| `format`, `version` | oui | toujours `"qcm-revision"` et `1` |
| `matiere.id`, `chapitres[].id`, `questions[].id` | oui | minuscules, chiffres et tirets ; **ne jamais changer** l'id d'une question existante |
| `chapitres[].ordre` | non | position du chapitre dans la matière |
| `chapitres[].groupe` | non | partie de la matière (ex. « Pharmacologie » dans l'UE1) : l'appli regroupe les chapitres par partie |
| `chapitres[].source` | non | nom du fichier de cours d'origine |
| `questions[].type` | oui | `"multiple"` (une ou plusieurs bonnes réponses) ou `"unique"` (une seule) |
| `questions[].origine` | non | `"genere"` (fait à partir du cours) ou `"annale"` (repris tel quel : QCM d'entraînement du tutorat ou vraie annale) |
| `questions[].annee` | non | pour une vraie annale d'examen : année ou session, affichée « Annale 2024 » |
| `items[].lettre` | oui | A, B, C… dans l'ordre |
| `items[].correct` | oui | `true` ou `false` |
| `items[].explication` | oui | commence par « Vrai. » ou « Faux. », puis explique avec les mots du cours |
| `items[].source.extrait` | oui | copie **mot pour mot** du texte du cours (`travail/…/texte.md`). « […] » permet de sauter un passage |
| `items[].source.page` | conseillé | page du cours où se trouve l'extrait |

Le vérificateur `node outils/verifier-pack.mjs <fichier>` contrôle tout cela. Il vérifie aussi que chaque
extrait se trouve vraiment dans le texte du cours.

## Ajouté automatiquement à la publication (ne pas écrire à la main)

- `chapitres[].pages`, `chapitres[].cours` : nombre de pages et paquet chiffré des pages du cours (lecteur).
- `items[].source.zones` : rectangles du passage cité sur la page, pour le surligner.

## Prévu pour la suite

- `questions[].schema` : image (schéma légendé par des numéros) affichée au-dessus des items.
