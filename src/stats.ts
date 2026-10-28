import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export interface Stats {
  aujourdhui: number // QCM faits aujourd'hui
  serie: number // jours consécutifs avec au moins un QCM
  reussite: number | null // % de QCM justes (sur les 200 dernières réponses)
  maitrise: Map<string, number> // par chapitre : part des QCM dont la dernière réponse est juste (0 à 1)
  duJour: string[] // QCM à revoir aujourd'hui (répétition espacée), les plus en retard d'abord
}

// Répétition espacée : plus un QCM est réussi de suite, plus on attend avant de le reproposer.
// Raté la dernière fois : 1 jour ; réussi 1, 2, 3, 4, 5+ fois de suite : 2, 5, 12, 30, 60 jours.
const INTERVALLES = [1, 2, 5, 12, 30, 60]
const JOUR = 86400000
const MAX_DU_JOUR = 30

function jour(date: number) {
  const d = new Date(date)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Calculé à partir de l'historique des réponses enregistré sur le téléphone.
export function useStats(): Stats | undefined {
  return useLiveQuery(async () => {
    const reponses = await db.reponses.orderBy('date').toArray()
    const questions = await db.questions.toArray()

    const aujourdhuiCle = jour(Date.now())
    const jours = new Set(reponses.map((r) => jour(r.date)))
    let serie = 0
    const d = new Date()
    // La série continue si elle s'est arrêtée hier : il reste la journée pour la prolonger.
    if (!jours.has(aujourdhuiCle)) d.setDate(d.getDate() - 1)
    while (jours.has(jour(d.getTime()))) {
      serie++
      d.setDate(d.getDate() - 1)
    }

    const recentes = reponses.slice(-200)
    const reussite = recentes.length
      ? Math.round((recentes.filter((r) => r.discordances === 0).length / recentes.length) * 100)
      : null

    const derniere = new Map<string, boolean>()
    const suite = new Map<string, { serie: number; date: number }>()
    for (const r of reponses) {
      derniere.set(r.questionId, r.discordances === 0)
      const s = suite.get(r.questionId)
      suite.set(r.questionId, { serie: r.discordances === 0 ? (s?.serie ?? 0) + 1 : 0, date: r.date })
    }
    const existantes = new Set(questions.map((q) => q.id))
    const maintenant = Date.now()
    const duJour = [...suite]
      .filter(([id]) => existantes.has(id))
      .map(([id, s]) => ({ id, retard: (maintenant - s.date) / (INTERVALLES[Math.min(s.serie, 5)] * JOUR) }))
      .filter((x) => x.retard >= 1)
      .sort((a, b) => b.retard - a.retard)
      .slice(0, MAX_DU_JOUR)
      .map((x) => x.id)
    const parChapitre = new Map<string, { total: number; justes: number }>()
    for (const q of questions) {
      const c = parChapitre.get(q.chapitreId) ?? { total: 0, justes: 0 }
      c.total++
      if (derniere.get(q.id)) c.justes++
      parChapitre.set(q.chapitreId, c)
    }
    const maitrise = new Map([...parChapitre].map(([id, c]) => [id, c.justes / c.total]))

    return {
      aujourdhui: reponses.filter((r) => jour(r.date) === aujourdhuiCle).length,
      serie,
      reussite,
      maitrise,
      duJour,
    }
  }, [])
}

// Une couleur stable par matière, pour la reconnaître d'un coup d'œil.
const COULEURS = ['#6C5CE7', '#00B894', '#E17055', '#0984E3', '#E84393', '#FDAA2B', '#00A8B5', '#8E6CEF']
export function couleurMatiere(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COULEURS[h % COULEURS.length]
}
