#!/usr/bin/env node
// Vérifie un fichier de QCM avant de l'envoyer sur le téléphone.
//  - structure conforme au format (docs/FORMAT-PACK.md) ;
//  - chaque item a une explication et un extrait du cours ;
//  - chaque extrait se trouve VRAIMENT dans le texte du cours (travail/<matiere>/<chapitre>/texte.md).
// C'est le garde-fou contre les QCM qui s'appuieraient sur autre chose que le cours.
//
// Usage : node outils/verifier-pack.mjs <pack.qcm.json> [--travail <dossier>] [--corriger-pages]
//   --corriger-pages : remplace dans le fichier les numéros de page faux par la page où l'extrait a été trouvé.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const cheminPack = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--travail')
const travail = args.includes('--travail') ? args[args.indexOf('--travail') + 1] : 'travail'
const corrigerPages = args.includes('--corriger-pages')
if (!cheminPack) {
  console.error('Usage : node outils/verifier-pack.mjs <pack.qcm.json> [--travail <dossier>] [--corriger-pages]')
  process.exit(1)
}

const erreurs = []
const avertissements = []
let pagesCorrigees = 0

// Rend la comparaison insensible à la mise en page : ligatures, apostrophes, césures, espaces, casse.
function normaliser(t) {
  return t
    .normalize('NFKC')
    .replace(/­/g, '')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    // Les tirets sont ignorés : « auriculo-ventriculaire » doit valoir « auriculo-\nventriculaire » et « ventricu-\nlaire ».
    .replace(/[‐‑‒–—-]\s*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ ?" ?/g, '"')
    .replace(/ ([,.;:!?)])/g, '$1')
    .replace(/\( /g, '(')
    .toLowerCase()
    .trim()
}

// Un extrait peut sauter un passage avec « … » ou « [...] » : chaque morceau doit être trouvé, dans l'ordre.
function trouver(extrait, texte) {
  const morceaux = normaliser(extrait)
    .split(/\s*(?:\[\.\.\.\]|\[…\]|\.\.\.|…)\s*/)
    .filter((m) => m.length > 0)
  let pos = 0
  for (const m of morceaux) {
    const i = texte.indexOf(m, pos)
    if (i < 0) return false
    pos = i + m.length
  }
  return morceaux.length > 0
}

function chargerTexte(matiereId, chapitreId) {
  const chemin = join(travail, matiereId, chapitreId, 'texte.md')
  if (!existsSync(chemin)) return null
  const brut = readFileSync(chemin, 'utf8')
  const pages = new Map()
  const parties = brut.split(/^=== Page (\d+) ===$/m)
  if (parties.length > 1) for (let i = 1; i < parties.length; i += 2) pages.set(Number(parties[i]), normaliser(parties[i + 1]))
  return { chemin, tout: normaliser(brut.replace(/^=== Page \d+ ===$/gm, ' ')), pages }
}

let pack
try {
  pack = JSON.parse(readFileSync(cheminPack, 'utf8'))
} catch (e) {
  console.error(`✗ Fichier illisible : ${e.message}`)
  process.exit(1)
}

if (pack.format !== 'qcm-revision') erreurs.push('format doit valoir "qcm-revision"')
if (pack.version !== 1) erreurs.push('version doit valoir 1')
if (!pack.matiere?.id || !pack.matiere?.nom) erreurs.push('matiere.id et matiere.nom sont obligatoires')
if (!Array.isArray(pack.chapitres) || pack.chapitres.length === 0) erreurs.push('aucun chapitre')

const ID = /^[a-z0-9][a-z0-9-]*$/
let nbQuestions = 0
let nbItems = 0
const repartition = new Map() // nombre de bonnes réponses -> nombre de questions
const lettresVraies = new Map()

for (const c of pack.chapitres ?? []) {
  const ou = `chapitre « ${c.nom ?? c.id} »`
  if (!c.id || !ID.test(c.id)) erreurs.push(`${ou} : id manquant ou invalide (minuscules, chiffres, tirets)`)
  if (!c.nom) erreurs.push(`${ou} : nom manquant`)
  const texte = pack.matiere?.id && c.id ? chargerTexte(pack.matiere.id, c.id) : null
  if (!texte) erreurs.push(`${ou} : texte du cours introuvable (${join(travail, pack.matiere?.id ?? '?', c.id ?? '?', 'texte.md')})`)

  const ids = new Set()
  const enonces = new Set()
  for (const q of c.questions ?? []) {
    nbQuestions++
    const qou = `${ou}, question ${q.id ?? '?'}`
    if (!q.id || !ID.test(q.id)) erreurs.push(`${qou} : id invalide`)
    if (ids.has(q.id)) erreurs.push(`${qou} : id en double`)
    ids.add(q.id)
    if (!['multiple', 'unique'].includes(q.type)) erreurs.push(`${qou} : type doit être "multiple" ou "unique"`)
    if (!q.enonce?.trim()) erreurs.push(`${qou} : énoncé vide`)
    if (enonces.has(q.enonce)) avertissements.push(`${qou} : même énoncé qu'une autre question`)
    enonces.add(q.enonce)

    const items = q.items ?? []
    if (items.length < 2) erreurs.push(`${qou} : moins de 2 items`)
    else if (items.length !== 5) avertissements.push(`${qou} : ${items.length} items (5 attendus en médecine)`)
    const vraies = items.filter((it) => it.correct === true).length
    repartition.set(vraies, (repartition.get(vraies) ?? 0) + 1)
    if (q.type === 'unique' && vraies !== 1) erreurs.push(`${qou} : type "unique" mais ${vraies} bonne(s) réponse(s)`)
    if (q.type === 'multiple' && vraies === 0) erreurs.push(`${qou} : aucune bonne réponse`)

    items.forEach((it, i) => {
      nbItems++
      const attendu = String.fromCharCode(65 + i)
      const iou = `${qou}, item ${it.lettre ?? attendu}`
      if (it.lettre !== attendu) erreurs.push(`${iou} : lettre "${it.lettre}" au lieu de "${attendu}"`)
      if (it.correct === true) lettresVraies.set(attendu, (lettresVraies.get(attendu) ?? 0) + 1)
      if (!it.texte?.trim()) erreurs.push(`${iou} : texte vide`)
      if (typeof it.correct !== 'boolean') erreurs.push(`${iou} : "correct" doit être true ou false`)
      if (!it.explication || it.explication.trim().length < 15) erreurs.push(`${iou} : explication absente ou trop courte`)
      const ex = it.source?.extrait
      if (!ex?.trim()) {
        erreurs.push(`${iou} : extrait du cours manquant`)
        return
      }
      if (ex.length > 400) avertissements.push(`${iou} : extrait long (${ex.length} caractères), raccourcis-le`)
      if (!texte) return
      if (!trouver(ex, texte.tout)) {
        erreurs.push(`${iou} : extrait INTROUVABLE dans le cours → « ${ex.slice(0, 90)}${ex.length > 90 ? '…' : ''} »`)
        return
      }
      if (texte.pages.size > 1) {
        const page = it.source.page
        if (page && texte.pages.has(page) && trouver(ex, texte.pages.get(page))) return
        const bonne = [...texte.pages.entries()].find(([, t]) => trouver(ex, t))?.[0]
        if (bonne && corrigerPages) {
          it.source.page = bonne
          pagesCorrigees++
        } else if (bonne) avertissements.push(`${iou} : extrait trouvé p. ${bonne}, pas p. ${page ?? '(aucune)'}`)
        // Sinon l'extrait est à cheval sur deux pages : on laisse tel quel.
      }
    })
  }
}

if (corrigerPages && pagesCorrigees > 0) {
  writeFileSync(cheminPack, JSON.stringify(pack, null, 2) + '\n')
  console.log(`↻ ${pagesCorrigees} numéro(s) de page corrigé(s) dans le fichier.`)
}

// Une seule configuration de réponses partout rendrait les QCM devinables.
if (nbQuestions >= 8 && repartition.size === 1)
  avertissements.push(`toutes les questions ont ${[...repartition.keys()][0]} bonne(s) réponse(s) : varie`)
for (const [lettre, n] of lettresVraies)
  if (nbQuestions >= 10 && n / nbQuestions > 0.8) avertissements.push(`l'item ${lettre} est vrai dans ${n}/${nbQuestions} questions : varie`)

console.log(`Fichier : ${cheminPack}`)
console.log(`${pack.chapitres?.length ?? 0} chapitre(s), ${nbQuestions} question(s), ${nbItems} item(s)`)
console.log(
  'Bonnes réponses par question : ' +
    [...repartition.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k} → ${v}`).join(', '),
)
for (const a of avertissements) console.log(`⚠️  ${a}`)
for (const e of erreurs) console.log(`✗ ${e}`)
if (erreurs.length) {
  console.log(`\n✗ ${erreurs.length} erreur(s) : corrige avant d'envoyer le fichier.`)
  process.exit(1)
}
console.log(`\n✓ Fichier valide${avertissements.length ? ` (${avertissements.length} avertissement(s))` : ''}.`)
