#!/usr/bin/env node
// Extrait le texte d'un cours, page par page, dans travail/<matiere>/<chapitre>/texte.md.
// Ce texte sert de référence : chaque extrait cité dans un QCM doit s'y trouver mot pour mot.
//
// Usage : node outils/extraire-texte.mjs <fichier du cours> <dossier de travail>
// Formats : .pdf (pdftotext), .docx/.doc/.rtf/.odt (textutil), .pptx, .txt/.md.
// Photos et notes manuscrites : pas d'extraction automatique, Claude écrit texte.md lui-même.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const [fichier, dossier] = process.argv.slice(2)
if (!fichier || !dossier) {
  console.error('Usage : node outils/extraire-texte.mjs <fichier du cours> <dossier de travail>')
  process.exit(1)
}

const ext = extname(fichier).toLowerCase()
let pages

if (ext === '.pdf') {
  const brut = execFileSync('pdftotext', ['-enc', 'UTF-8', fichier, '-'], { maxBuffer: 1 << 28 }).toString()
  pages = brut.split('\f')
  if (pages.at(-1).trim() === '') pages.pop()
} else if (['.docx', '.doc', '.rtf', '.odt'].includes(ext)) {
  pages = [execFileSync('textutil', ['-convert', 'txt', '-stdout', fichier], { maxBuffer: 1 << 28 }).toString()]
} else if (ext === '.pptx') {
  // Une diapositive = une « page ». Le texte est dans les balises <a:t> des fichiers ppt/slides/slideN.xml.
  const liste = execFileSync('unzip', ['-Z1', fichier]).toString().split('\n')
  const diapos = liste
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
  pages = diapos.map((d) => {
    const xml = execFileSync('unzip', ['-p', fichier, d], { maxBuffer: 1 << 26 }).toString()
    return xml
      .split(/<\/a:p>/)
      .map((para) => [...para.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(''))
      .filter((l) => l.trim())
      .join('\n')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  })
} else if (['.txt', '.md'].includes(ext)) {
  pages = [readFileSync(fichier, 'utf8')]
} else {
  console.error(`Format ${ext} non pris en charge automatiquement : transcris le cours dans ${dossier}/texte.md.`)
  process.exit(2)
}

mkdirSync(dossier, { recursive: true })
const sortie = pages.map((p, i) => `=== Page ${i + 1} ===\n${p.trim()}\n`).join('\n')
writeFileSync(join(dossier, 'texte.md'), sortie)
const mots = sortie.split(/\s+/).length
console.log(`${pages.length} page(s), ${mots} mots → ${join(dossier, 'texte.md')}`)
if (mots < 50 * pages.length)
  console.log('⚠️  Peu de texte trouvé : le document est peut-être scanné (images). Dans ce cas, transcris-le à la main.')
