import { db } from './db'
import { enregistrerPack } from './importation'
import type { Pack } from './types'

// Les QCM sont publiés chiffrés dans public/contenu/ (voir outils/publier-contenu.mjs).
// Ta sœur tape une fois le code d'accès : on en tire la clé, gardée sur le téléphone,
// puis l'appli télécharge et met à jour ses cours toute seule à chaque ouverture.

const CLE_STOCKEE = 'contenu.cle'
const EMPREINTES = 'contenu.empreintes'
const BASE = `${import.meta.env.BASE_URL}contenu/`

interface Index {
  iterations: number
  sel: string
  temoin: string
  fichiers: { nom: string; matiere: string; empreinte: string }[]
}

export class CodeIncorrect extends Error {}
export class HorsLigne extends Error {}

const versOctets = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
const versBase64 = (o: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(o)))

function lire(cle: string) {
  try {
    return localStorage.getItem(cle)
  } catch {
    return null
  }
}

function ecrire(cle: string, valeur: string | null) {
  try {
    if (valeur === null) localStorage.removeItem(cle)
    else localStorage.setItem(cle, valeur)
  } catch {
    /* stockage indisponible */
  }
}

// Même normalisation que l'outil de publication : minuscules, sans accents, tirets.
function normaliser(code: string) {
  return code
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
}

async function chargerIndex(): Promise<Index> {
  try {
    const r = await fetch(`${BASE}index.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) throw new Error()
    return await r.json()
  } catch {
    throw new HorsLigne()
  }
}

async function dechiffrer(cle: CryptoKey, donnees: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: donnees.slice(0, 12) }, cle, donnees.slice(12))
  return new Uint8Array(clair)
}

async function degzipper(octets: Uint8Array<ArrayBuffer>): Promise<string> {
  const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(flux).text()
}

async function cleDepuisStockage(): Promise<CryptoKey | null> {
  const brute = lire(CLE_STOCKEE)
  if (!brute) return null
  return crypto.subtle.importKey('raw', versOctets(brute), 'AES-GCM', false, ['decrypt'])
}

export function aUnCode() {
  return !!lire(CLE_STOCKEE)
}

// Vérifie le code tapé grâce au « témoin » de l'index, puis garde la clé sur le téléphone.
export async function validerCode(code: string) {
  const index = await chargerIndex()
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(normaliser(code)), 'PBKDF2', false, ['deriveKey'])
  const cle = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: versOctets(index.sel), iterations: index.iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt'],
  )
  try {
    await dechiffrer(cle, versOctets(index.temoin))
  } catch {
    throw new CodeIncorrect()
  }
  ecrire(CLE_STOCKEE, versBase64(await crypto.subtle.exportKey('raw', cle)))
  ecrire(EMPREINTES, null)
}

// Télécharge les matières nouvelles ou modifiées et retire celles qui ne sont plus publiées.
// Renvoie le nombre de matières mises à jour.
export async function synchroniser(): Promise<number> {
  const cle = await cleDepuisStockage()
  if (!cle) throw new CodeIncorrect()
  const index = await chargerIndex()
  try {
    await dechiffrer(cle, versOctets(index.temoin))
  } catch {
    // Le code a changé depuis : il faudra taper le nouveau.
    ecrire(CLE_STOCKEE, null)
    throw new CodeIncorrect()
  }

  let connues: Record<string, string> = {}
  try {
    connues = JSON.parse(lire(EMPREINTES) ?? '{}')
  } catch {
    /* on retélécharge tout */
  }
  let misesAJour = 0
  for (const f of index.fichiers) {
    if (connues[f.matiere] === f.empreinte && (await db.matieres.get(f.matiere))) continue
    const r = await fetch(`${BASE}${f.nom}?v=${f.empreinte}`)
    if (!r.ok) throw new HorsLigne()
    const json = await degzipper(await dechiffrer(cle, new Uint8Array(await r.arrayBuffer())))
    await enregistrerPack(JSON.parse(json) as Pack)
    connues[f.matiere] = f.empreinte
    misesAJour++
  }

  // Tout ce qui n'est plus publié disparaît (anciens essais, matière retirée).
  const publiees = new Set(index.fichiers.map((f) => f.matiere))
  for (const m of await db.matieres.toArray()) if (!publiees.has(m.id)) await supprimerMatiere(m.id)
  // Historique et erreurs de QCM qui n'existent plus (anciens essais importés à la main).
  const existantes = new Set(await db.questions.toCollection().primaryKeys())
  await db.reponses.filter((r) => !existantes.has(r.questionId)).delete()
  await db.erreurs.filter((e) => !existantes.has(e.questionId)).delete()
  ecrire(EMPREINTES, JSON.stringify(connues))
  return misesAJour
}

async function supprimerMatiere(matiereId: string) {
  await db.transaction('rw', [db.matieres, db.chapitres, db.questions, db.erreurs, db.reponses], async () => {
    const ids = await db.questions.where('matiereId').equals(matiereId).primaryKeys()
    await db.questions.bulkDelete(ids)
    await db.erreurs.bulkDelete(ids)
    await db.reponses.where('questionId').anyOf(ids).delete()
    await db.chapitres.where('matiereId').equals(matiereId).delete()
    await db.matieres.delete(matiereId)
  })
}
