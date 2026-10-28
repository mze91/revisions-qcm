// Retrouve, sur la page du PDF, l'emplacement d'un extrait cité (pour le surligner dans l'appli).
// Utilise les coordonnées des mots données par `pdftotext -bbox-layout`, et la même normalisation que le
// vérificateur, pour que tout extrait accepté par le vérificateur soit retrouvé ici.

import { execFileSync } from 'node:child_process'

export function normaliser(t) {
  return t
    .normalize('NFKC')
    .replace(/­/g, '')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[‐‑‒–—-]\s*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ ?" ?/g, '"')
    .replace(/ ([,.;:!?)])/g, '$1')
    .replace(/\( /g, '(')
    .toLowerCase()
    .trim()
}

const decoder = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")

// Pages du PDF : dimensions et mots (texte + boîte), dans l'ordre de lecture.
export function lireMots(pdf) {
  const xml = execFileSync('pdftotext', ['-bbox-layout', pdf, '-'], { maxBuffer: 1 << 28 }).toString()
  const pages = []
  for (const p of xml.split('<page ').slice(1)) {
    const largeur = Number(p.match(/width="([\d.]+)"/)[1])
    const hauteur = Number(p.match(/height="([\d.]+)"/)[1])
    const mots = []
    let ligne = 0
    for (const l of p.split('<line ').slice(1)) {
      ligne++
      for (const m of l.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g))
        mots.push({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], t: decoder(m[5]), ligne })
    }
    pages.push({ largeur, hauteur, ...indexer(mots) })
  }
  return pages
}

// Construit le texte normalisé de la page en gardant, pour chaque caractère, le mot d'origine.
function indexer(mots) {
  let texte = ''
  const proprietaire = []
  for (const [i, m] of mots.entries()) {
    const n = normaliser(m.t)
    if (!n) continue
    const precedent = texte.at(-1)
    const colle = !texte || /^[,.;:!?)"]/.test(n) || precedent === '"' || precedent === '(' || /[‐‑‒–—-]$/.test(mots[i - 1]?.t ?? '')
    if (!colle) {
      texte += ' '
      proprietaire.push(-1)
    }
    for (const _ of n) proprietaire.push(i)
    texte += n
  }
  return { mots, texte, proprietaire }
}

// Zones (en fractions de la page) couvrant l'extrait, ou null s'il n'est pas retrouvé.
export function zonesExtrait(pages, extrait, pagePreferee) {
  const morceaux = normaliser(extrait)
    .split(/\s*(?:\[\.\.\.\]|\[…\]|\.\.\.|…)\s*/)
    .filter((m) => m.length > 0)
  if (!morceaux.length) return null
  const ordre = pagePreferee ? [pagePreferee - 1, ...pages.keys()].filter((v, i, a) => a.indexOf(v) === i) : [...pages.keys()]
  for (const ip of ordre) {
    const page = pages[ip]
    if (!page) continue
    const indices = new Set()
    let pos = 0
    let ok = true
    for (const m of morceaux) {
      const i = page.texte.indexOf(m, pos)
      if (i < 0) {
        ok = false
        break
      }
      for (let k = i; k < i + m.length; k++) if (page.proprietaire[k] >= 0) indices.add(page.proprietaire[k])
      pos = i + m.length
    }
    if (!ok || !indices.size) continue
    // Une boîte par ligne, légèrement élargie.
    const parLigne = new Map()
    for (const i of indices) {
      const w = page.mots[i]
      const b = parLigne.get(w.ligne) ?? { x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1 }
      parLigne.set(w.ligne, { x0: Math.min(b.x0, w.x0), y0: Math.min(b.y0, w.y0), x1: Math.max(b.x1, w.x1), y1: Math.max(b.y1, w.y1) })
    }
    const r = (v) => Math.round(v * 10000) / 10000
    return {
      page: ip + 1,
      zones: [...parLigne.values()].map((b) => [
        r((b.x0 - 2) / page.largeur),
        r((b.y0 - 1) / page.hauteur),
        r((b.x1 - b.x0 + 4) / page.largeur),
        r((b.y1 - b.y0 + 2) / page.hauteur),
      ]),
    }
  }
  return null
}
