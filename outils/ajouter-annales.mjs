#!/usr/bin/env node
// Range les QCM d'annales dans les fiches de cours.
//  - lit travail/annales/<matiere>/*.qcm.json (une épreuve par fichier, déjà vérifiée) ;
//  - retire des packs/<matiere>/*.qcm.json les QCM d'annales déjà rangés (champ annee), puis remet ceux des épreuves :
//    on peut relancer l'outil autant de fois qu'on veut ;
//  - un QCM identique à un autre (même énoncé, mêmes items) n'est gardé qu'une fois.
//
// Usage : node outils/ajouter-annales.mjs <matiere>

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const matiere = process.argv[2]
if (!matiere) {
  console.error('Usage : node outils/ajouter-annales.mjs <matiere>')
  process.exit(1)
}

const dossierAnnales = join('travail', 'annales', matiere)
const dossierPacks = join('packs', matiere)
const lire = (chemin) => JSON.parse(readFileSync(chemin, 'utf8'))
const empreinte = (q) =>
  [q.enonce, ...q.items.map((it) => it.texte)]
    .join('|')
    .normalize('NFKD')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()

const parFiche = new Map()
const vues = new Map()
let doublons = 0
const epreuves = readdirSync(dossierAnnales)
  .filter((f) => f.endsWith('.qcm.json'))
  .sort()
for (const f of epreuves) {
  for (const c of lire(join(dossierAnnales, f)).chapitres) {
    if (!existsSync(join(dossierPacks, `${c.id}.qcm.json`))) {
      console.error(`✗ ${f} : la fiche « ${c.id} » n'existe pas dans ${dossierPacks}/`)
      process.exit(1)
    }
    for (const q of c.questions) {
      const e = empreinte(q)
      if (vues.has(e)) {
        console.log(`= ${q.id} (${q.annee}) est identique à ${vues.get(e)} : gardé une fois`)
        doublons++
        continue
      }
      vues.set(e, `${q.id} (${q.annee})`)
      if (!parFiche.has(c.id)) parFiche.set(c.id, [])
      parFiche.get(c.id).push(q)
    }
  }
}

let total = 0
for (const f of readdirSync(dossierPacks).filter((f) => f.endsWith('.qcm.json'))) {
  const chemin = join(dossierPacks, f)
  const pack = lire(chemin)
  const avant = JSON.stringify(pack)
  for (const c of pack.chapitres) {
    const annales = parFiche.get(c.id) ?? []
    c.questions = [...c.questions.filter((q) => !q.annee), ...annales]
    total += annales.length
  }
  if (JSON.stringify(pack) === avant) continue
  writeFileSync(chemin, JSON.stringify(pack, null, 2) + '\n')
  try {
    execFileSync('node', ['outils/verifier-pack.mjs', chemin], { stdio: 'pipe' })
  } catch (e) {
    console.error(`✗ ${chemin} n'est plus valide :\n${e.stdout}`)
    process.exit(1)
  }
}
console.log(`✓ ${total} QCM d'annales (${epreuves.length} épreuves) rangés dans ${parFiche.size} fiches. Doublons écartés : ${doublons}.`)
