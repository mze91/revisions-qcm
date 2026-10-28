#!/usr/bin/env node
// Prépare les QCM à mettre en ligne, chiffrés, dans public/contenu/.
//  - lit les matières listées dans outils/contenu-publie.json ;
//  - vérifie chaque fichier packs/<matiere>/*.qcm.json (refuse de publier un fichier non valide) ;
//  - regroupe les chapitres d'une matière, compresse, chiffre (AES-256-GCM) → public/contenu/<matiere>.bin ;
//  - rend les pages de chaque fiche en images (cache dans travail/_pages/), chiffrées dans
//    public/contenu/pages/<matiere>/<fiche>.bin, et repère sur la page chaque extrait cité (surlignage) ;
//  - écrit public/contenu/index.json (liste des fichiers, sel, témoin de code), sans aucun contenu lisible.
// Le chiffrement est déterministe (même contenu → même fichier) pour ne pas regonfler le dépôt à chaque publication.
// La clé vient du code d'accès (fichier .code-acces, jamais publié), dérivé avec PBKDF2-SHA256.
// L'appli fait le même calcul quand ta sœur tape le code (src/contenu.ts).
//
// Usage : node outils/publier-contenu.mjs
//         node outils/publier-contenu.mjs --nouveau-code   (change le code : à redonner à ta sœur)

import { execFileSync } from 'node:child_process'
import { createCipheriv, createHash, createHmac, pbkdf2Sync, randomBytes, randomInt } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'
import { lireMots, zonesExtrait } from './zones.mjs'

const ITERATIONS = 600000
const FICHIER_CODE = '.code-acces'
const SORTIE = 'public/contenu'

// Code facile à taper sur un téléphone : trois mots et deux chiffres.
const MOTS = `abeille arbre argile atome aurore azur baleine bambou bateau biche bleuet bougie boussole brume cactus
canard castor cerise chamois chene citron colibri comete corail coton dauphin delta desert dune ecureuil etoile
falaise faucon figue flamant foret fougere fraise galet gazelle geyser girafe glacier grenade griffon hamac herisson
hibou horizon iceberg ile iris jade jaguar jasmin koala lagon lama lavande lezard lilas lion loutre lune lynx
mangue marmotte melon merle meteore mimosa mouette myrtille nuage oasis ocean olive orage orchidee ours panda
papaye papillon pastel pelican perle phare pingouin pivoine planete plume poney prairie quartz racine radis
rameau renard requin rivage roseau rubis sable safran saphir saule savane sequoia sirene soleil source tigre
toucan tulipe ruisseau vallee vanille velours volcan zebre`.split(/\s+/)

function nouveauCode() {
  const mot = () => MOTS[randomInt(MOTS.length)]
  return `${mot()}-${mot()}-${mot()}-${String(randomInt(10, 100))}`
}

// Même normalisation que dans l'appli : minuscules, sans accents ni espaces superflus.
export function normaliserCode(code) {
  return code
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
}

function chiffrer(cle, donnees) {
  // IV tiré du contenu : deux contenus différents n'ont jamais le même IV, un même contenu donne le même fichier.
  const iv = createHmac('sha256', cle).update(donnees).digest().subarray(0, 12)
  const c = createCipheriv('aes-256-gcm', cle, iv)
  const corps = Buffer.concat([c.update(donnees), c.final()])
  // Ordre attendu par WebCrypto : iv | texte chiffré | étiquette d'authentification.
  return Buffer.concat([iv, corps, c.getAuthTag()])
}

const config = JSON.parse(readFileSync(process.env.CONTENU_CONFIG ?? 'outils/contenu-publie.json', 'utf8'))
let code = existsSync(FICHIER_CODE) ? readFileSync(FICHIER_CODE, 'utf8').trim() : ''
const ancienIndex = existsSync(join(SORTIE, 'index.json')) ? JSON.parse(readFileSync(join(SORTIE, 'index.json'), 'utf8')) : null
const changer = process.argv.includes('--nouveau-code') || !code
if (changer) {
  code = nouveauCode()
  writeFileSync(FICHIER_CODE, code + '\n')
}
// Le sel reste le même tant que le code ne change pas : la clé déjà enregistrée sur le téléphone reste valable.
const sel = !changer && ancienIndex?.sel ? Buffer.from(ancienIndex.sel, 'base64') : randomBytes(16)
const cle = pbkdf2Sync(normaliserCode(code), sel, ITERATIONS, 32, 'sha256')

const RESOLUTION = 120
const QUALITE = 70
mkdirSync(SORTIE, { recursive: true })
const produits = new Set()

function ecrireSortie(chemin, donnees) {
  mkdirSync(dirname(chemin), { recursive: true })
  if (!existsSync(chemin) || !readFileSync(chemin).equals(donnees)) writeFileSync(chemin, donnees)
  produits.add(chemin)
}

// Images des pages d'une fiche, mises en cache tant que le PDF ne change pas.
function imagesPages(pdf, dossierCache) {
  const empreinte = createHash('sha256').update(readFileSync(pdf)).digest('hex') + `-${RESOLUTION}-${QUALITE}`
  const temoin = join(dossierCache, 'empreinte.txt')
  if (!existsSync(temoin) || readFileSync(temoin, 'utf8') !== empreinte) {
    rmSync(dossierCache, { recursive: true, force: true })
    mkdirSync(dossierCache, { recursive: true })
    execFileSync('pdftoppm', ['-r', String(RESOLUTION), '-jpeg', '-jpegopt', `quality=${QUALITE}`, pdf, join(dossierCache, 'p')], { stdio: 'ignore' })
    writeFileSync(temoin, empreinte)
  }
  return readdirSync(dossierCache)
    .filter((f) => f.endsWith('.jpg'))
    .sort((a, b) => Number(a.match(/(\d+)\.jpg$/)[1]) - Number(b.match(/(\d+)\.jpg$/)[1]))
    .map((f) => readFileSync(join(dossierCache, f)))
}

// Paquet de pages : nombre de pages, taille de chaque image, puis les images à la suite.
function paquetPages(images) {
  const tete = Buffer.alloc(4 + 4 * images.length)
  tete.writeUInt32LE(images.length, 0)
  images.forEach((im, i) => tete.writeUInt32LE(im.length, 4 + 4 * i))
  return Buffer.concat([tete, ...images])
}

const fichiers = []
let total = 0
let surlignes = 0
let items = 0
for (const m of config.matieres) {
  const dossier = join('packs', m.id)
  const packs = readdirSync(dossier).filter((f) => f.endsWith('.qcm.json')).sort()
  const chapitres = []
  for (const f of packs) {
    const chemin = join(dossier, f)
    try {
      execFileSync('node', ['outils/verifier-pack.mjs', chemin], { stdio: 'pipe' })
    } catch (e) {
      console.error(`✗ ${chemin} n'est pas valide : publication annulée.\n${e.stdout}`)
      process.exit(1)
    }
    const pack = JSON.parse(readFileSync(chemin, 'utf8'))
    for (const c of pack.chapitres) {
      const pdf = m.cours && c.source ? join(m.cours, c.source) : null
      if (pdf && existsSync(pdf)) {
        const images = imagesPages(pdf, join('travail', '_pages', m.id, c.id))
        const sortie = join(SORTIE, 'pages', m.id, `${c.id}.bin`)
        const bin = chiffrer(cle, paquetPages(images))
        ecrireSortie(sortie, bin)
        c.pages = images.length
        // La version dans l'adresse fait retélécharger la fiche quand elle change (sinon, cache du téléphone).
        c.cours = `${relative(SORTIE, sortie)}?v=${createHash('sha256').update(bin).digest('hex').slice(0, 10)}`
        const mots = lireMots(pdf)
        for (const q of c.questions)
          for (const it of q.items) {
            items++
            const z = zonesExtrait(mots, it.source.extrait, it.source.page)
            if (z) {
              it.source.page = z.page
              it.source.zones = z.zones
              surlignes++
            }
          }
      }
      chapitres.push(c)
    }
  }
  const nbQuestions = chapitres.reduce((s, c) => s + c.questions.length, 0)
  total += nbQuestions
  const json = JSON.stringify({ format: 'qcm-revision', version: 1, matiere: { id: m.id, nom: m.nom }, chapitres })
  const nom = `${m.id}.bin`
  ecrireSortie(join(SORTIE, nom), chiffrer(cle, gzipSync(Buffer.from(json), { mtime: 0 })))
  fichiers.push({ nom, matiere: m.id, empreinte: createHash('sha256').update(json).digest('hex').slice(0, 16) })
  const nbPages = chapitres.reduce((s, c) => s + (c.pages ?? 0), 0)
  console.log(`✓ ${m.nom} : ${chapitres.length} fiches, ${nbQuestions} QCM, ${nbPages} pages de cours`)
}

// Retire les anciens fichiers qui ne sont plus publiés.
function nettoyer(d) {
  for (const f of readdirSync(d)) {
    const c = join(d, f)
    if (statSync(c).isDirectory()) nettoyer(c)
    else if (f !== 'index.json' && !produits.has(c)) rmSync(c)
  }
}
nettoyer(SORTIE)

const index = {
  version: 1,
  date: new Date().toISOString(),
  iterations: ITERATIONS,
  sel: sel.toString('base64'),
  temoin: chiffrer(cle, Buffer.from('qcm-revision')).toString('base64'),
  fichiers,
}
writeFileSync(join(SORTIE, 'index.json'), JSON.stringify(index, null, 1) + '\n')
console.log(`\n${total} QCM prêts dans ${SORTIE}/. Passages surlignables : ${surlignes}/${items} items.`)
if (changer) console.log(`\n🔑 Nouveau code d'accès à donner à ta sœur : ${code}`)
