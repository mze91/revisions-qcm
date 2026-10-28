import { db } from './db'
import { compterDiscordances, enregistrerReponse, melanger, points } from './correction'
import type { Bareme, Examen, Question } from './types'

// Examen blanc : tirage selon les réglages, chrono, correction seulement à la fin.
// Les QCM viennent uniquement de ceux déjà publiés (fiches et tutorat) : rien n'est inventé.

export interface Reglages {
  groupes: string[] | null // parties retenues (null = toute la matière)
  source: 'tout' | 'tutorat'
  nombre: number
  minutes: number | null // null = automatique (1 min 30 par QCM)
  bareme: Bareme
}

export const REGLAGES_DEFAUT: Reglages = { groupes: null, source: 'tout', nombre: 30, minutes: null, bareme: 'discordances' }

export interface ExamenEnCours {
  matiereId: string
  ids: string[]
  reponses: Record<string, string[]>
  aRevoir: string[]
  debut: number
  dureeMax: number // secondes
  bareme: Bareme
}

const CLE_EN_COURS = 'examen.encours'
const cleReglages = (matiereId: string) => `examen.reglages.${matiereId}`

function lireJson<T>(cle: string): T | null {
  try {
    const v = localStorage.getItem(cle)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}

function ecrireJson(cle: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(cle)
    else localStorage.setItem(cle, JSON.stringify(v))
  } catch {
    /* stockage indisponible */
  }
}

export const lireReglages = (matiereId: string): Reglages => ({ ...REGLAGES_DEFAUT, ...lireJson<Reglages>(cleReglages(matiereId)) })
export const garderReglages = (matiereId: string, r: Reglages) => ecrireJson(cleReglages(matiereId), r)
export const examenEnCours = () => lireJson<ExamenEnCours>(CLE_EN_COURS)
export const garderEnCours = (e: ExamenEnCours | null) => ecrireJson(CLE_EN_COURS, e)

export const dureeSecondes = (r: Reglages, nombre: number) => (r.minutes ?? Math.max(5, Math.round(nombre * 1.5))) * 60

// Questions disponibles pour ces réglages.
export async function questionsDisponibles(matiereId: string, r: Reglages): Promise<Question[]> {
  const chapitres = await db.chapitres.where('matiereId').equals(matiereId).toArray()
  const ids = chapitres.filter((c) => !r.groupes || r.groupes.includes(c.groupe ?? '')).map((c) => c.id)
  const qs = await db.questions.where('chapitreId').anyOf(ids).toArray()
  return r.source === 'tutorat' ? qs.filter((q) => q.origine === 'annale') : qs
}

export async function demarrer(matiereId: string, r: Reglages): Promise<ExamenEnCours> {
  const qs = await questionsDisponibles(matiereId, r)
  const ids = melanger(qs.map((q) => q.id)).slice(0, r.nombre)
  const e: ExamenEnCours = {
    matiereId,
    ids,
    reponses: {},
    aRevoir: [],
    debut: Date.now(),
    dureeMax: dureeSecondes(r, ids.length),
    bareme: r.bareme,
  }
  garderEnCours(e)
  return e
}

// Corrige la copie, enregistre les réponses (et « Mes erreurs ») et l'examen dans l'historique.
export async function terminer(e: ExamenEnCours): Promise<number> {
  const questions = (await db.questions.bulkGet(e.ids)).filter((q): q is Question => !!q)
  let total = 0
  let justes = 0
  for (const q of questions) {
    const choix = e.reponses[q.id] ?? []
    const d = compterDiscordances(q, choix)
    total += points(d, e.bareme)
    if (d === 0) justes++
    await enregistrerReponse(q, choix, 'examen')
  }
  const examen: Examen = {
    matiereId: e.matiereId,
    debut: e.debut,
    fin: Math.min(Date.now(), e.debut + e.dureeMax * 1000),
    dureeMax: e.dureeMax,
    bareme: e.bareme,
    questions: questions.map((q) => ({ questionId: q.id, choix: e.reponses[q.id] ?? [], aRevoir: e.aRevoir.includes(q.id) })),
    points: total,
    justes,
  }
  const id = await db.examens.add(examen)
  garderEnCours(null)
  return id as number
}

export const noteSur20 = (ex: Examen) => (ex.questions.length ? ((ex.points ?? 0) / ex.questions.length) * 20 : 0)
