#!/usr/bin/env node
// Mélange l'ordre des items de chaque question, puis renumérote les lettres (A, B, C…).
// Sert quand le vérificateur signale qu'une même lettre est trop souvent vraie.
// Les explications ne doivent donc jamais citer une lettre.
//
// Usage : node outils/melanger-items.mjs <pack.qcm.json>

import { readFileSync, writeFileSync } from 'node:fs'

const fichier = process.argv[2]
if (!fichier) {
  console.error('Usage : node outils/melanger-items.mjs <pack.qcm.json>')
  process.exit(1)
}

const pack = JSON.parse(readFileSync(fichier, 'utf8'))
for (const c of pack.chapitres)
  for (const q of c.questions) {
    const items = q.items
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    items.forEach((it, i) => (it.lettre = String.fromCharCode(65 + i)))
  }
writeFileSync(fichier, JSON.stringify(pack, null, 2) + '\n')
console.log('Items mélangés. Relance le vérificateur.')
