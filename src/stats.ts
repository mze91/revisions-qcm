import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export interface Stats {
  aujourdhui: number // QCM faits aujourd'hui
  serie: number // jours consécutifs avec au moins un QCM
  reussite: number | null // % de QCM justes (sur les 200 dernières réponses)
  maitrise: Map<string, number> // par chapitre : part des QCM dont la dernière réponse est juste (0 à 1)
}

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
    for (const r of reponses) derniere.set(r.questionId, r.discordances === 0)
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
